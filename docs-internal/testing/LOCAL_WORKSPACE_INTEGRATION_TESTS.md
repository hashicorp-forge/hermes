# Local Workspace Integration Tests

**Date**: October 7, 2025  
**Status**: ✅ Complete  
**Test Coverage**: CreateFileAsUser + /me endpoint verification

## Overview

This document describes the integration tests for the local workspace provider, specifically focusing on:

1. **CreateFileAsUser** functionality - Creating documents as specific users
2. **/me endpoint** verification - Ensuring users.json is properly used for authentication

## Test Files

### 1. `tests/integration/workspace/local_adapter_test.go`

**New Test Suite**: `TestLocalAdapter_CreateFileAsUser`

Tests the `CreateFileAsUser` method which creates documents by copying templates and setting the specified user as owner.

#### Test Cases

##### 1. CreateFileAsUser_BasicUsage
- **Purpose**: Verify basic document creation as a specific user
- **Steps**:
  1. Create a template document
  2. Call `CreateFileAsUser` to copy template with specific owner
  3. Verify document created with correct name and ID
  4. Verify `created_as_user` metadata is set correctly
  5. Verify content was copied from template
- **Assertions**:
  - Document ID is generated
  - Document name matches specified name
  - `metadata["created_as_user"]` equals specified user email
  - Content matches template content

##### 2. CreateFileAsUser_DifferentUsers
- **Purpose**: Verify multiple users can independently create documents from same template
- **Steps**:
  1. Create shared template
  2. Create 3 documents as different users (alice, bob, charlie)
  3. Verify each document has correct owner metadata
  4. Verify all documents are independent with unique IDs
- **Assertions**:
  - Each document has correct `created_as_user` metadata
  - All document IDs are unique
  - Each user's document is independent

##### 3. CreateFileAsUser_NonexistentTemplate
- **Purpose**: Verify error handling for invalid template ID
- **Steps**:
  1. Call `CreateFileAsUser` with nonexistent template ID
  2. Verify appropriate error returned
- **Assertions**:
  - Error is returned
  - Error message contains "not found"

##### 4. CreateFileAsUser_EmptyUserEmail
- **Purpose**: Verify behavior when user email is empty
- **Steps**:
  1. Create template
  2. Call `CreateFileAsUser` with empty string for user email
  3. Verify document created successfully
  4. Verify metadata has empty string for `created_as_user`
- **Assertions**:
  - No error returned
  - Document created
  - `metadata["created_as_user"]` equals empty string

##### 5. CreateFileAsUser_PreservesTemplateContent
- **Purpose**: Verify template content is exactly preserved in copy
- **Steps**:
  1. Create template with complex content:
     - Multiple sections
     - Special characters: `!@#$%^&*()`
     - Unicode: 你好, مرحبا, Привет
     - Code blocks
  2. Call `CreateFileAsUser` to copy template
  3. Verify all content elements are preserved
- **Assertions**:
  - All template sections present in copy
  - Special characters preserved
  - Unicode text preserved
  - Code blocks preserved
  - `created_as_user` metadata set separately from content

**Test Results**: ✅ All 5 test cases passing

### 2. `tests/integration/workspace/me_endpoint_test.go`

**Test Suites**: 
- `TestLocalWorkspace_MeEndpoint_UsesUsersJSON`
- `TestLocalWorkspace_MeEndpoint_WithAuthClaims`

Tests the `/api/v2/me` endpoint to verify it correctly retrieves user information from `users.json` when using the local workspace provider.

#### Test Suite 1: UsesUsersJSON

##### Test Cases

1. **Test User from users.json**
   - User: `test@hermes.local`
   - Verifies: email, name, given_name, family_name, photo_url from users.json

2. **Admin User from users.json**
   - User: `admin@hermes.local`
   - Verifies: Complete user profile data

3. **Regular User from users.json**
   - User: `user@hermes.local`
   - Verifies: Complete user profile data

4. **Unauthenticated Request Returns 401**
   - Verifies: Endpoint rejects requests without authentication

5. **HEAD Method Works For Auth Check**
   - Verifies: HEAD method returns 200 for authenticated users with empty body

6. **User Not In UsersJSON Returns Error**
   - User: `nonexistent@hermes.local`
   - Verifies: Returns 500 error when user not found

#### Test Suite 2: WithAuthClaims

**Purpose**: Verify `/me` endpoint works with OIDC claims (Dex authentication flow)

- Creates request with `UserClaims` in context
- Verifies response uses claims data instead of users.json lookup
- Simulates Dex OIDC authentication scenario

**Test Results**: ✅ All 8 test cases passing

## Implementation Details

### CreateFileAsUser Method

**Location**: `pkg/workspace/adapters/local/provider.go`

```go
func (p *ProviderAdapter) CreateFileAsUser(templateID, destFolderID, name, userEmail string) (*drive.File, error)
```

**Behavior**:
1. Copies template document using `CopyDocument`
2. Sets `created_as_user` metadata field with specified user email
3. Updates document to persist metadata
4. Returns Google Drive API compatible `*drive.File`

**Metadata Storage**:
- Uses `document.Metadata["created_as_user"]` to store owner email
- Separate from frontmatter metadata
- Persists across document operations

### users.json Integration

**Location**: `testing/users.json` (mounted into Docker container)

**Format**:
```json
{
  "email@domain.com": {
    "email": "email@domain.com",
    "name": "Full Name",
    "given_name": "First",
    "family_name": "Last",
    "photo_url": "https://...",
    "id": "uuid",
    "groups": ["group1", "group2"]
  }
}
```

**JSON Unmarshaling**: 
- Added JSON tags to `workspace.User` struct in `pkg/workspace/types.go`
- Tags map snake_case JSON fields to PascalCase Go fields:
  - `given_name` → `GivenName`
  - `family_name` → `FamilyName`
  - `photo_url` → `PhotoURL`

### /me Endpoint Flow

**Path**: `internal/api/v2/me.go` → `MeHandler()`

1. Check for authentication (user email in context)
2. Check for OIDC claims in context (preferred if present)
3. If no claims, use `WorkspaceProvider.SearchPeople(email)` to lookup user
4. Validate returned data (email matches, verified, primary)
5. Build `MeGetResponse` with user profile data
6. Return JSON response

**Required Metadata**: The endpoint expects:
- `EmailAddresses[0].Metadata.Primary` = true
- `EmailAddresses[0].Metadata.Verified` = true
- `EmailAddresses[0].Metadata.Source.Id` = user identifier
- `Names[0].GivenName` and `FamilyName` populated

## Fixed Issues

### Issue 1: Missing EmailAddress Metadata
**Problem**: `/me` endpoint panicked with nil pointer dereference at line 170

**Cause**: `SearchPeople` and `SearchDirectory` didn't populate `EmailAddress.Metadata` fields

**Fix**: Added complete metadata structure to both methods:
```go
person.EmailAddresses = []*people.EmailAddress{
    {
        Value: user.Email,
        Type:  "work",
        Metadata: &people.FieldMetadata{
            Primary:  true,
            Verified: true,
            Source: &people.Source{
                Id:   user.Email,
                Type: "DOMAIN_PROFILE",
            },
        },
    },
}
```

### Issue 2: JSON Field Mapping
**Problem**: `given_name`, `family_name`, `photo_url` from users.json weren't being unmarshaled

**Cause**: `workspace.User` struct lacked JSON tags

**Fix**: Added JSON tags to struct definition in `pkg/workspace/types.go`:
```go
type User struct {
    Email      string         `json:"email"`
    Name       string         `json:"name"`
    GivenName  string         `json:"given_name"`
    FamilyName string         `json:"family_name"`
    PhotoURL   string         `json:"photo_url"`
    Metadata   map[string]any `json:"metadata,omitempty"`
}
```

## Running Tests

### Run CreateFileAsUser Tests Only
```bash
go test -tags=integration -v ./tests/integration/workspace/ -run TestLocalAdapter_CreateFileAsUser -timeout 5m
```

### Run /me Endpoint Tests Only
```bash
go test -tags=integration -v ./tests/integration/workspace/ -run TestLocalWorkspace_MeEndpoint -timeout 5m
```

### Run All Workspace Integration Tests
```bash
go test -tags=integration -v ./tests/integration/workspace/ -timeout 5m
```

## Test Coverage Summary

| Component | Test Cases | Status |
|-----------|-----------|--------|
| CreateFileAsUser | 5 | ✅ All passing |
| /me Endpoint (users.json) | 6 | ✅ All passing |
| /me Endpoint (OIDC claims) | 1 | ✅ Passing |
| **Total** | **12** | **✅ 100%** |

## Dependencies

**Required Files**:
- `pkg/workspace/adapters/local/provider.go` - ProviderAdapter implementation
- `pkg/workspace/adapters/local/people.go` - PeopleService implementation
- `pkg/workspace/types.go` - User struct with JSON tags
- `internal/api/v2/me.go` - MeHandler endpoint
- `testing/users.json` - Test user database

**External Libraries**:
- `google.golang.org/api/people/v1` - People API types
- `google.golang.org/api/drive/v3` - Drive API types
- `github.com/stretchr/testify` - Test assertions

## Notes

1. **Frontmatter Behavior**: The local adapter adds YAML frontmatter to documents. Tests account for this by checking content containment rather than exact equality.

2. **Concurrent Test Flakiness**: `TestLocalAdapter_ConcurrentOperations/ConcurrentUpdates` occasionally fails due to race conditions. This is a pre-existing issue unrelated to CreateFileAsUser or /me endpoint changes.

3. **Authentication Context**: Tests use `context.WithValue` to simulate authenticated requests by setting `pkgauth.UserEmailKey` and optionally `pkgauth.UserClaimsKey`.

4. **Timeout Wrapper**: All tests use `WithTimeout()` helper to prevent indefinite hangs and provide progress updates.

## Future Improvements

1. **Permission Testing**: Add tests for document permissions and sharing
2. **Group Management**: Test `ListGroups` and `ListUserGroups` methods
3. **Email Service**: Test `SendEmail` functionality
4. **Revision Management**: Test `GetLatestRevision`, `KeepRevisionForever` methods
5. **Concurrent Access**: Fix and improve concurrent operations tests

## Related Documentation

- `docs-internal/testing/TESTING_ENV_COMPLETE.md` - Full acceptance testing environment
- `testing/README-local-workspace.md` - Local workspace provider setup guide
- `testing/README.md` - Testing environment overview
- `.github/copilot-instructions.md` - Project build and test instructions
