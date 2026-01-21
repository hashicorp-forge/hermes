# Google Workspace Setup

This guide covers setting up Google Workspace integration for Hermes in production environments.

## Overview

Google Workspace integration provides:
- **Authentication**: User login via Google OAuth
- **Document Storage**: Google Docs for document creation and editing
- **User Directory**: People API for user lookup and collaboration
- **Email Notifications**: Gmail API for document notifications
- **Group Approvals** (optional): Admin SDK API for Google Groups as approvers

## Prerequisites

- Google Workspace account (sign up at [workspace.google.com](https://workspace.google.com/))
- Domain admin access for directory sharing and service account delegation
- A shared drive for document organization

## Setup Steps

### 1. Create Google Cloud Project

1. [Create a Google Cloud project](https://developers.google.com/workspace/guides/create-project)
2. Enable the following APIs via [Google Workspace APIs](https://developers.google.com/workspace/guides/enable-apis):
   - **Google Docs API** (required)
   - **Google Drive API** (required)
   - **Gmail API** (required for email notifications)
   - **People API** (required for user lookup)
   - **Admin SDK API** (optional, for Google Groups as document approvers)

### 2. Configure OAuth Consent Screen

[Configure the OAuth consent screen](https://developers.google.com/workspace/guides/configure-oauth-consent):

1. Enter your domain name in "Authorized domains" (e.g., `mycompany.com`)
2. Add required OAuth scopes:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

### 3. Create OAuth Client ID (Frontend)

[Create OAuth client ID credentials](https://developers.google.com/workspace/guides/create-credentials) for "web application":

1. **Authorized JavaScript origins**:
   - `https://{HERMES_DOMAIN}`
   - `http://localhost:8000` (for local development)

2. **Authorized redirect URIs**:
   - `https://{HERMES_DOMAIN}/torii/redirect.html`
   - `http://localhost:8000/torii/redirect.html` (for local development)

3. Note the **Client ID** - you may need it for the `HERMES_WEB_GOOGLE_OAUTH2_CLIENT_ID` environment variable at build time.

### 4. Create OAuth Client ID (Backend - Development)

For local development without a service account:

1. [Create OAuth client ID credentials](https://developers.google.com/workspace/guides/create-credentials) for "desktop application"
2. Download the OAuth credentials JSON file
3. Save to project root as `credentials.json`
4. On first run, Hermes will open a browser for authentication

**Note**: This method is for development only. Production deployments should use a service account (see below).

### 5. Create Service Account (Production)

For production deployments:

1. [Create a service account](https://developers.google.com/workspace/guides/create-credentials#service-account) in your Google Cloud project
2. Create a new key (JSON type) and download it
3. [Delegate domain-wide authority](https://developers.google.com/identity/protocols/oauth2/service-account#delegatingauthority) to the service account

**Required OAuth Scopes**:
```
https://www.googleapis.com/auth/directory.readonly
https://www.googleapis.com/auth/documents
https://www.googleapis.com/auth/drive
https://www.googleapis.com/auth/gmail.send
```

**If using group approvals**, also add:
```
https://www.googleapis.com/auth/admin.directory.group.readonly
```

4. Grant the service account user (configured as `subject` in config.hcl) the "Groups Reader" role if using group approvals

### 6. Enable Directory Sharing

To enable searching for users in the People API:

1. Go to Google Workspace Admin Console
2. Navigate to **Directory Settings** → **Sharing settings**
3. In the **Contact sharing** section, enable **"Enable contact sharing"**

See details: https://support.google.com/a/answer/6343701

## Google Drive Organization

We recommend using a [shared drive](https://support.google.com/a/users/answer/7212025?hl=en) with the following structure:

```
Shared Drives/
└── Hermes/
    ├── Documents/          (shortcuts folder - organized hierarchy)
    │   ├── RFC/
    │   │   ├── Labs/
    │   │   └── Cloud/
    │   ├── PRD/
    │   └── FRD/
    ├── All Documents/      (documents folder - flat structure)
    └── Drafts/             (drafts folder - private to Hermes)
```

### Folder Purposes

**Documents Folder** (shortcuts):
- Organized hierarchy: `{doc_type}/{product}/{document}`
- Contains shortcuts to published documents
- Share with all users for easy browsing in Google Drive
- Provides best viewing experience when navigating directly in Drive

**All Documents Folder**:
- Flat structure containing all published documents
- Should be shared with all users
- Not ideal for direct viewing (use Documents folder instead)

**Drafts Folder**:
- Contains all draft documents before publication
- Keep **private** - accessible only to Hermes service account
- Hermes automatically shares drafts with document owners and collaborators
- Documents moved to "All Documents" upon publication

## Configuration

### Development Configuration (OAuth Desktop)

```hcl
google_workspace {
  auth {
    # OAuth desktop credentials (credentials.json)
    credentials_file = "credentials.json"
    token_file       = "token.json"
  }

  create_shortcuts = true
  
  folders {
    shortcuts = "1234567890abcdefghijklmnopqrst"  # Documents folder ID
    documents = "abcdefghijklmnopqrstuvwxyz1234"  # All Documents folder ID
    drafts    = "zyxwvutsrqponmlkjihgfedcba9876"  # Drafts folder ID
  }
}
```

### Production Configuration (Service Account)

```hcl
google_workspace {
  auth {
    service_account {
      client_email  = "hermes@mycompany.iam.gserviceaccount.com"
      private_key   = <<-EOT
        -----BEGIN PRIVATE KEY-----
        MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
        -----END PRIVATE KEY-----
      EOT
      subject       = "hermes-service@mycompany.com"
    }
  }

  create_shortcuts = true
  
  folders {
    shortcuts = "1234567890abcdefghijklmnopqrst"
    documents = "abcdefghijklmnopqrstuvwxyz1234"
    drafts    = "zyxwvutsrqponmlkjihgfedcba9876"
  }

  # Optional: Enable Google Groups as approvers
  group_approvals {
    enabled = true
  }
}
```

### Get Folder IDs

To get folder IDs from Google Drive:
1. Navigate to the folder in Google Drive
2. Copy the ID from the URL: `https://drive.google.com/drive/folders/{FOLDER_ID}`

## Authentication Flow

### For Users (Google OAuth)

1. User clicks "Sign in with Google" in Hermes
2. Redirected to Google OAuth consent screen
3. Grants permissions to Hermes application
4. Redirected back to Hermes with access token
5. Hermes validates token and creates session

### For Backend (Service Account)

1. Backend loads service account credentials on startup
2. Uses credentials to impersonate the configured subject user
3. All API calls made on behalf of the subject user
4. No browser authentication required

## Troubleshooting

### "User not found" Errors

**Cause**: User doesn't exist in Google Workspace directory

**Solution**: Configure `user_not_found_email` to send notifications:
```hcl
google_workspace {
  user_not_found_email = "admin@mycompany.com"
}
```

### Service Account Permission Errors

**Cause**: Service account lacks domain-wide delegation or OAuth scopes

**Solution**:
1. Verify OAuth scopes in Admin Console delegation settings
2. Ensure service account has been granted domain-wide authority
3. Check that subject user has appropriate Google Workspace licenses

### Directory Sharing Not Working

**Cause**: Contact sharing not enabled in Google Workspace

**Solution**:
1. Go to Admin Console → Directory Settings → Sharing settings
2. Enable "Contact sharing"
3. Wait up to 24 hours for changes to propagate

## See Also

- [Authentication Architecture](AUTH_ARCHITECTURE_DIAGRAMS.md)
- [Configuration Documentation](CONFIG_HCL_DOCUMENTATION.md)
- [Local Workspace Setup](README-local-workspace.md) (for development without Google)
- [Auth Providers Overview](README-auth-providers.md)
