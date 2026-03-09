# Hermes Merge Plan: hermes-sharepoint → hermes

**Date:** March 9, 2026  
**Objective:** Merge SharePoint-backed hermes into the original Google-backed hermes repo so both backends coexist in a single codebase. Future development targets SharePoint only; Google Hermes is frozen/maintenance-only.

---

## Table of Contents

1. [Pre-Merge Preparation (hermes repo)](#1-pre-merge-preparation-hermes-repo)
2. [Architecture Strategy: Build Tags vs Runtime Config](#2-architecture-strategy-build-tags-vs-runtime-config)
3. [Go Module & Dependencies](#3-go-module--dependencies)
4. [Database Schema Changes](#4-database-schema-changes)
5. [Config (config.hcl) Differences](#5-config-confighcl-differences)
6. [Authentication Changes](#6-authentication-changes)
7. [API Endpoint Differences](#7-api-endpoint-differences)
8. [New Packages & Code to Merge](#8-new-packages--code-to-merge)
9. [Frontend (Ember.js) Differences](#9-frontend-emberjs-differences)
10. [hermes-plugin (Word Add-In)](#10-hermes-plugin-word-add-in)
11. [Makefile & Build Changes](#11-makefile--build-changes)
12. [CI/CD Pipeline Differences](#12-cicd-pipeline-differences)
13. [Dockerfile Changes](#13-dockerfile-changes)
14. [Enterprise-Specific Information to Remove](#14-enterprise-specific-information-to-remove)
15. [Files to NOT Merge (Junk/Migration Artifacts)](#15-files-to-not-merge-junkmigration-artifacts)
16. [Minimizing Google Hermes Maintenance Pain](#16-minimizing-google-hermes-maintenance-pain)
17. [Testing Plan](#17-testing-plan)
18. [Merge Execution Order](#18-merge-execution-order)
19. [Risk Assessment](#19-risk-assessment)

---

## 1. Pre-Merge Preparation (hermes repo)

### 1.1 Create a New Branch
```bash
git checkout -b merge/sharepoint-into-hermes
```

### 1.2 Remove Deprecation/Migration Banners
The hermes repo has 2 permanent, non-dismissible migration banners that must be removed:

#### Files to modify:

| File | Change |
|------|--------|
| `web/app/components/dashboard/new-features-banner.hbs` | Revert to original dismissible feature banner (or remove entirely) |
| `web/app/components/dashboard/new-features-banner.ts` | Revert `isShown` to original logic (check localStorage, not `return true`) |
| `web/app/components/document/sidebar/migration-banner.hbs` | **Delete this file** (entirely new for migration) |
| `web/app/components/document/sidebar/migration-banner.ts` | **Delete this file** |
| `web/app/components/dashboard/index.hbs` | Keep `<Dashboard::NewFeaturesBanner />` if reverting, or remove the line |
| `web/app/components/document/sidebar.hbs` | Remove `<Document::Sidebar::MigrationBanner />` (line ~21) |
| `web/app/styles/components/dashboard.scss` | Remove `.permanent-migration-banner`, `.migration-link`, `@keyframes pulseRed` CSS (lines ~87-200, duplicated) |
| `web/tests/integration/components/dashboard/new-features-banner-test.ts` | Fix or remove stale test |

**Note:** There is NO server-side read-only enforcement. The "read-only mode" is purely frontend banners.

---

## 2. Architecture Strategy: Build Tags vs Runtime Config

### Problem
We need both Google and SharePoint backends to coexist. Future changes target SharePoint only. We want zero Google Hermes maintenance overhead.

### Recommended Approach: **Runtime Config (Provider Pattern)**

**Why not build tags:**
- Build tags create two separate binaries — harder to test, ship, maintain
- CI must build and test twice
- Accidental tag omission causes silent failures

**Why runtime config is better:**
- Single binary, single CI pipeline
- Provider determined by config: if `sharepoint {}` block exists → SharePoint mode; if `google_workspace.auth {}` → Google mode
- Google code is untouched, frozen — it compiles but never activates in SharePoint deployments
- Zero maintenance for Google — code stays, just isn't executed

### Implementation Pattern
```go
// In server startup (server.go / cmd/commands/server/server.go):
if cfg.SharePoint != nil && cfg.SharePoint.ClientID != "" {
    // Initialize SharePoint provider
    srv.SharePoint = sharepointhelper.NewService(cfg.SharePoint, log)
} else if cfg.GoogleWorkspace.Auth != nil {
    // Initialize Google Workspace provider (legacy)
    srv.GWService = gw.NewFromConfig(cfg.GoogleWorkspace.Auth)
}
```

The auth layer already follows this pattern in hermes-sharepoint:
- If `oidc_alb` is enabled → use OIDC ALB auth
- Else → use Microsoft Auth as fallback

For the merged repo, add Google Auth as a third option:
- If `oidc_alb` is enabled → use OIDC ALB auth (any OIDC provider)
- Else if `sharepoint` config exists → use Microsoft Auth
- Else → use Google Auth (legacy)

---

## 3. Go Module & Dependencies

### 3.1 Go Version
| Repo | Go Version |
|------|-----------|
| hermes | 1.18 |
| hermes-sharepoint | 1.24.0 |

**Action:** Upgrade to Go 1.24.0 (hermes-sharepoint's version). Go 1.18 is EOL.

### 3.2 Module Path
Both repos use: `github.com/hashicorp-forge/hermes` — **No conflict.**

### 3.3 Dependency Version Differences

| Dependency | hermes | hermes-sharepoint | Action |
|-----------|--------|------------------|--------|
| `golang-jwt/jwt/v5` | v5.0.0 | v5.3.0 | **Upgrade to v5.3.0** |
| `golang.org/x/oauth2` | v0.8.0 | v0.32.0 | **Upgrade to v0.32.0** |
| `cloud.google.com/go/compute` | v1.19.3 | (removed) | Keep (needed for Google) |
| `cloud.google.com/go/compute/metadata` | v0.2.3 | v0.7.0 | **Upgrade to v0.7.0** |
| `golang.org/x/crypto` | v0.33.0 | v0.45.0 | **Upgrade to v0.45.0** |
| `golang.org/x/net` | v0.25.0 | v0.35.0 | **Upgrade to latest** |
| `golang.org/x/sync` | v0.11.0 | v0.15.0 | **Upgrade to v0.15.0** |
| `golang.org/x/sys` | v0.30.0 | v0.33.0 | **Upgrade to v0.33.0** |
| `golang.org/x/text` | v0.22.0 | v0.26.0 | **Upgrade to v0.26.0** |

All other direct dependencies have **identical versions**.

### 3.4 Strategy: Single go.mod

**Use a single `go.mod` file.** Both backends compile from the same module. The SharePoint packages are additional — they don't replace any Google packages.

**Steps:**
1. Start with hermes-sharepoint's `go.mod` (newer versions)
2. Run `go mod tidy` to ensure Google Workspace dependencies are retained
3. Verify both `google.golang.org/api` and `golang.org/x/oauth2` (used by both) are at compatible versions
4. Run `go build ./...` to confirm everything compiles

**No need for two separate `go.mod` files.** The dependency overlap is ~95% identical. The extra SharePoint deps are small (no new direct dependencies were added — SharePoint uses stdlib `net/http` + `golang.org/x/oauth2` which is already present).

---

## 4. Database Schema Changes

### 4.1 Model Differences (Side-by-Side)

#### `Document` model
| Field | hermes | hermes-sharepoint | Migration Impact |
|-------|--------|------------------|-----------------|
| File ID field | `GoogleFileID string` (not null, unique) | `FileID string` (not null, unique) | **Dual-field approach (see below)** |
| `Archived` | Not present | `bool` (new field) | **ADD column** (default false) |
| All other fields | Identical | Identical | No change |

**Decision: Option A — Keep BOTH fields (Dual-Field Pattern)**

We keep `GoogleFileID` untouched for Google code paths and add `FileID` as a new nullable column for SharePoint. This avoids ANY changes to existing Google code.

```go
type Document struct {
    // ... other fields ...

    // GoogleFileID is the Google Drive file ID. Used when running in Google Workspace mode.
    // For SharePoint deployments, this field is empty/null.
    // DESIGN DECISION: We keep both GoogleFileID and FileID to avoid modifying any
    // Google-path code. See README "Dual-Provider Architecture" section for rationale.
    GoogleFileID string `gorm:"index;default:null"`  // relaxed from not-null for mixed-DB

    // FileID is the SharePoint/generic file ID. Used when running in SharePoint mode.
    // For Google deployments, this field is empty/null.
    FileID *string `gorm:"index;default:null"`  // NEW nullable column

    // Archived indicates whether a draft has been archived (SharePoint feature).
    Archived bool `gorm:"default:false"`  // NEW
}

// GetFileIdentifier returns the active file ID regardless of which provider is active.
// SharePoint docs use FileID; Google docs use GoogleFileID.
func (d *Document) GetFileIdentifier() string {
    if d.FileID != nil && *d.FileID != "" {
        return *d.FileID
    }
    return d.GoogleFileID
}

// BeforeCreate validates that every document has at least one file identifier.
func (d *Document) BeforeCreate(tx *gorm.DB) error {
    if d.GoogleFileID == "" && (d.FileID == nil || *d.FileID == "") {
        return fmt.Errorf("document must have either GoogleFileID or FileID")
    }
    return nil
}
```

**Data integrity constraint:** A database-level CHECK ensures no orphaned rows can exist:
```sql
ALTER TABLE documents ADD CONSTRAINT chk_document_has_file_id
  CHECK (google_file_id IS NOT NULL OR file_id IS NOT NULL);
```
Both the Go-level `BeforeCreate` hook (catches in application) and the SQL CHECK (catches at DB level) enforce that every document has at least one provider file ID.

**Why Option A over Option C (rename):**
| Aspect | Option C (rename GoogleFileID→FileID) | Option A (keep both) |
|--------|---------------------------------------|---------------------|
| Google code changes | Must find-and-replace ALL `GoogleFileID` refs | **Zero changes** to Google code |
| Data migration | Copy column data + drop old column | Just ADD new column |
| Risk to Google | Medium — search-replace can miss edge cases | **None** — Google code untouched |
| GORM AutoMigrate | Can't rename columns (manual SQL needed) | **Handles it automatically** |
| Schema cleanliness | Cleaner (one field) | Slight duplication (justified by safety) |

> **Documentation requirement:** Add a "Dual-Provider Architecture" section to README.md and a code comment on the Document struct explaining why both fields exist. This prevents future developers from "cleaning up" the duplication without understanding the rationale.

#### `DocumentFileRevision` model

> **CRITICAL UPDATE:** The SP production database (`hermesdb_new`) was inspected and reveals:
> ```
> PK:  (document_id, file_revision_id, name)   — btree index document_file_revisions_pkey
> google_drive_file_revision_id  text  (nullable, non-PK)
> ```
> This **exactly matches hermes-sharepoint's Go model** and **completely invalidates the previous "Option C"** (which assumed `GoogleDriveFileRevisionID` was/could be the PK).

| Field | hermes (Google) | hermes-sharepoint | SP Production DB | Merged Model |
|-------|----------------|-------------------|------------------|--------------|
| `DocumentID` | `uint` (PK) | `uint` (PK) | `bigint NOT NULL` (PK) | `uint` (PK) — unchanged |
| `FileRevisionID` | **Not present** | `string` (PK) | `text NOT NULL` (PK) | `string` (PK) — **use SP version** |
| `GoogleDriveFileRevisionID` | `string` (PK) | `*string` (nullable) | `text` (nullable) | `*string` (nullable) — **demoted from PK** |
| `Name` | `string` (PK) | `string` (PK) | `text NOT NULL` (PK) | `string` (PK) — unchanged |

**Action: Use hermes-sharepoint's model directly — it matches the production DB.**

The merged model is identical to hermes-sharepoint's existing `DocumentFileRevision`:

```go
type DocumentFileRevision struct {
    gorm.Model

    Document   Document `gorm:"constraint:OnDelete:CASCADE"`
    DocumentID uint     `gorm:"primaryKey"`

    // PK — provider-agnostic revision identifier.
    // SharePoint: SharePoint file revision ID.
    // Google: Google Drive file revision ID (same value also in GoogleDriveFileRevisionID).
    FileRevisionID string `gorm:"primaryKey"`

    // Google-specific revision ID. Nullable, non-PK.
    // For Google rows: populated with the Google Drive revision ID.
    // For SharePoint rows: NULL.
    GoogleDriveFileRevisionID *string `gorm:"default:null"`

    Name string `gorm:"primaryKey"`
}
```

**Impact on Google code (updated during merge — must compile):**

Even though the Google backend is not being deployed now, the merged code must compile and pass `go test ./...`. The following files need `GoogleDriveFileRevisionID` → `FileRevisionID` changes as part of the merge:

| File | Occurrences | Change Needed |
|------|------------|---------------|
| `pkg/models/document_file_revision.go` | 3 (struct + Create + Get validation) | Use SP model; validate `FileRevisionID` instead |
| `internal/api/v2/approvals.go` | 2 (creating revisions) | Set `FileRevisionID: latestRev.Id` (+ optionally `GoogleDriveFileRevisionID`) |
| `internal/api/v2/reviews.go` | 1 (creating revision) | Same as above |
| `internal/api/v2/helpers.go` | 1 (reading `fr.GoogleDriveFileRevisionID`) | Read `fr.FileRevisionID` instead |
| `internal/api/helpers.go` | 1 (reading, v1 version) | Same as above |
| `pkg/document/document.go` | 2 (reading + creating) | Use `FileRevisionID`; optionally also set `GoogleDriveFileRevisionID` |
| `internal/cmd/.../migrate_algolia_to_postgresql.go` | 2 (migration operator) | Set `FileRevisionID` instead of `GoogleDriveFileRevisionID` |
| **Total** | **~12 non-test** | Tests (~13 occurrences across 3 test files) also need updating |

**Why this is safe:**
- These are straightforward field renames in handler code — same data, different field name
- The `GoogleDriveFileRevisionID` field still exists as nullable — Google data is preserved
- The PK `FileRevisionID` can hold Google Drive revision IDs (they're just strings)
- Google handlers set `FileRevisionID: latestRev.Id` AND `GoogleDriveFileRevisionID: &latestRev.Id` — both fields populated
- All changes are verified by `go build ./...` and `go test ./...` during the merge

**Database migration for this table: ZERO.** The SP production DB already has exactly this schema.

#### `IndexerFolder` model
| Field | hermes | hermes-sharepoint | Migration Impact |
|-------|--------|------------------|-----------------|
| `GoogleDriveID` | `not null, uniqueIndex` | `nullable, uniqueIndex` | **Changed to nullable** |
| `SharePointFolderID` | Not present | `nullable, uniqueIndex` | **ADD column** |

**Action:** Use hermes-sharepoint's version. Google deployments continue using `GoogleDriveID`. `SharePointFolderID` is null for them.

**Data integrity constraint:** Same pattern as `documents` — ensure every folder has at least one identifier:
```sql
ALTER TABLE indexer_folders ADD CONSTRAINT chk_folder_has_id
  CHECK (google_drive_id IS NOT NULL OR share_point_folder_id IS NOT NULL);
```

#### `DocumentCustomField` model
| Field | hermes | hermes-sharepoint | Notes |
|-------|--------|------------------|-------|
| `Value` | `string` | `string` | **Already identical** |

**Action: None.** Both repos already use `Value string`. The original `datatypes.JSON` type was changed to `string` before the fork — both files have `// Value  datatypes.JSON` commented out on line 17 and use `Value string` on line 18. The full file (183 lines) is byte-identical across repos. No migration needed.

#### New Models (SharePoint-only, already exist in hermes)
| Model | Status |
|-------|--------|
| `DocumentGroupReview` | **Present in BOTH repos** (identical) |
| `Group` | **Present in BOTH repos** (identical) |

**No new tables to add.** Both repos already have the same auto-migrate list.

### 4.2 Database Migration Strategy

With Option A (dual fields), the migration is **additive-only** — the safest possible approach.

Since both repos use GORM AutoMigrate (no manual migration files), the approach is:

1. Use merged model definitions (hermes models + new nullable fields)
2. GORM AutoMigrate will automatically (runs on every app startup in `NewDB()`):
   - Add `file_id` column (nullable) to `documents`
   - Add `archived` column (default false) to `documents`
   - **Skip `document_file_revisions`** — SP production DB already has the correct schema
   - Add `share_point_folder_id` column (nullable) to `indexer_folders`
3. **Automated post-migration SQL in `internal/db/db.go`** (runs after AutoMigrate on every startup):

Add the following to `NewDB()` right after the existing `db.AutoMigrate(...)` call. This follows the same pattern as the existing `CREATE EXTENSION IF NOT EXISTS citext` that already runs on every startup:

```go
// Automatically migrate models.
if err := db.AutoMigrate(
    models.ModelsToAutoMigrate()...,
); err != nil {
    return nil, fmt.Errorf("error migrating database: %w", err)
}

// Post-migration constraints (idempotent — safe to run on every startup).
// Follows the same pattern as CREATE EXTENSION citext above.
postMigrationSQL := []string{
    // Relax NOT NULL on Google-specific columns (allows null for SP-only deployments).
    // DO/EXCEPTION block makes this idempotent — silently skips if already nullable.
    `DO $$ BEGIN
        ALTER TABLE documents ALTER COLUMN google_file_id DROP NOT NULL;
    EXCEPTION WHEN others THEN NULL;
    END $$`,
    `DO $$ BEGIN
        ALTER TABLE indexer_folders ALTER COLUMN google_drive_id DROP NOT NULL;
    EXCEPTION WHEN others THEN NULL;
    END $$`,
    // CHECK constraints: ensure every row has at least one provider identifier.
    // duplicate_object exception means constraint already exists — skip safely.
    `DO $$ BEGIN
        ALTER TABLE documents ADD CONSTRAINT chk_document_has_file_id
          CHECK (google_file_id IS NOT NULL OR file_id IS NOT NULL);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`,
    `DO $$ BEGIN
        ALTER TABLE indexer_folders ADD CONSTRAINT chk_folder_has_id
          CHECK (google_drive_id IS NOT NULL OR share_point_folder_id IS NOT NULL);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`,
}
for _, sql := range postMigrationSQL {
    if err := db.Exec(sql).Error; err != nil {
        return nil, fmt.Errorf("error running post-migration SQL: %w", err)
    }
}
```

**Why this approach:**
- `NewDB()` already runs raw SQL on every startup (`CREATE EXTENSION IF NOT EXISTS citext`) — this is the established pattern
- Every statement is **idempotent** via `DO $$ BEGIN ... EXCEPTION ... END $$` — safe to run 1000 times
- **Zero manual steps** — constraints are applied automatically on first deploy and silently skipped thereafter
- **Works for all 6 deployment scenarios** (Section 20) — fresh, existing, Google, SP, mixed
- No separate migration command to remember or forget

**Equivalent raw SQL (for reference/manual use only — normally not needed):**

```sql
-- These run automatically via NewDB(). Listed here for manual debugging only.

-- 1. Relax Google-specific NOT NULL constraints
ALTER TABLE documents ALTER COLUMN google_file_id DROP NOT NULL;
ALTER TABLE indexer_folders ALTER COLUMN google_drive_id DROP NOT NULL;

-- 2. GORM AutoMigrate handles adding new columns, but for manual use:
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_id TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
-- document_file_revisions: NO MIGRATION NEEDED (SP production DB already has correct schema)
ALTER TABLE indexer_folders ADD COLUMN IF NOT EXISTS share_point_folder_id TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_file_id ON documents(file_id);
CREATE INDEX IF NOT EXISTS idx_indexer_folders_sp_folder_id ON indexer_folders(share_point_folder_id);

-- 3. CHECK constraints
ALTER TABLE documents ADD CONSTRAINT chk_document_has_file_id
  CHECK (google_file_id IS NOT NULL OR file_id IS NOT NULL);
ALTER TABLE indexer_folders ADD CONSTRAINT chk_folder_has_id
  CHECK (google_drive_id IS NOT NULL OR share_point_folder_id IS NOT NULL);

-- NOTE: document_file_revisions needs NO migration or CHECK constraint.
-- SP production DB already has PK = (document_id, file_revision_id, name)
-- with google_drive_file_revision_id as a nullable non-PK column.
-- The merged Go model matches this schema exactly.
```

**Summary of migration approach:**
- `documents`: Additive only — add `file_id`, `archived` columns. Relax `google_file_id` NOT NULL. Add CHECK constraint. **All automated via `NewDB()`.**
- `document_file_revisions`: **ZERO migration** — SP production DB already has the correct schema.
- `indexer_folders`: Additive only — add `share_point_folder_id`. Relax `google_drive_id` NOT NULL. Add CHECK constraint. **All automated via `NewDB()`.**

**Existing SharePoint data is untouched.** Google-specific columns are nullable and unused until Google backend is deployed.

---

## 5. Config (config.hcl) Differences

### 5.1 Config Struct Differences

| Config Section | hermes | hermes-sharepoint | Action |
|---------------|--------|------------------|--------|
| `Okta` / `OidcAlb` | `Okta *oktaalb.Config` (hcl: "okta") | `OidcAlb *oidcalb.Config` (hcl: "oidc_alb") | **Renamed + generalized** |
| `SharePoint` | Not present | `*SharePointConfig` (hcl: "sharepoint") | **ADD** |
| `Email.BCCBatchSize` | Not present | `int` | **ADD** |
| `Email.Retry` | Not present | `*EmailRetry` block | **ADD** |
| `Server.DevMode` | Not present | `bool` | **ADD** |
| `Server.TLSEnabled` | Not present | `bool` | **ADD** |
| `Server.TLSCert` | Not present | `string` | **ADD** |
| `Server.TLSKey` | Not present | `string` | **ADD** |
| `DocumentType.MSTemplate` | Not present | `string` (hcl: "ms_template") | **ADD** |

### 5.2 Auth Config Rename: `okta` → `oidc_alb`

hermes uses `okta {}` block. hermes-sharepoint renames it to `oidc_alb {}` and generalizes from Okta-specific to generic OIDC.

**Decision: Option A — Support BOTH `okta {}` and `oidc_alb {}` in config parsing.**

If `okta {}` is found, treat it as `oidc_alb {}`. Log a deprecation warning. This ensures existing Google deployments continue working without config file changes.

```go
// In config parsing:
if cfg.Okta != nil && cfg.OidcAlb == nil {
    log.Warn("'okta' config block is deprecated, use 'oidc_alb' instead")
    cfg.OidcAlb = cfg.Okta // treat okta as oidc_alb
}
```

### 5.3 Example Merged config.hcl (Template)

```hcl
# === Provider Selection ===
# Configure ONE of: google_workspace OR sharepoint

# For Google Workspace backend:
google_workspace {
  auth { ... }
  docs_folder = "..."
  domain = "your-domain.com"
  drafts_folder = "..."
  shortcuts_folder = "..."
  oauth2 {
    client_id = "..."
    hd = "..."
    redirect_uri = "..."
  }
}

# For SharePoint backend:
# sharepoint {
#   client_id = "..."
#   client_secret = "..."
#   tenant_id = "..."
#   site_id = "..."
#   drive_id = "..."
#   domain = "your-domain.com"
#   docs_folder = "PublishedDocuments"
#   drafts_folder = "DraftDocuments"
# }

# Auth: use "okta" for Google, "oidc_alb" for SharePoint, or neither for direct provider auth
# okta { ... }        # Google deployments (legacy name)
# oidc_alb { ... }    # SharePoint deployments (generic OIDC)
```

---

## 6. Authentication Changes

### 6.1 Auth Package Differences

| Package | hermes | hermes-sharepoint | Role |
|---------|--------|------------------|------|
| `internal/auth/auth.go` | Uses `google` + `oktaalb` | Uses `microsoft` + `oidcalb` | **Entry point — must merge** |
| `internal/auth/google/` | Present | Present (unused) | Google OAuth2 |
| `internal/auth/oktaalb/` | Present | **Renamed to `oidcalb/`** | OIDC ALB middleware |
| `internal/auth/microsoft/` | Not present | Present | **ADD** — Microsoft OAuth2 |
| `internal/auth/sharepoint/` | Not present | Present | **ADD** — SharePoint token auth |
| `internal/auth/oidcalb/` | Not present | Present (replaces oktaalb) | **Replaces oktaalb** |

### 6.2 Merged Auth Flow

```go
// internal/auth/auth.go (merged)
func AuthenticateRequest(cfg, gwSvc, spSvc, log, next) http.Handler {
    // Priority 1: OIDC ALB (works with any OIDC provider — Okta, IBM W3, etc.)
    if cfg.OidcAlb != nil && !cfg.OidcAlb.Disabled {
        return oidcalb.New(*cfg.OidcAlb, log).EnforceOIDCAuth(next)
    }
    // Backward compat: also check legacy "okta" config
    if cfg.Okta != nil && !cfg.Okta.Disabled {
        return oktaalb.New(*cfg.Okta, log).EnforceOktaAuth(next)
    }
    // Priority 2: Microsoft Auth (SharePoint mode)
    if cfg.SharePoint != nil && cfg.SharePoint.ClientID != "" {
        return microsoft.AuthenticateRequest(cfg.SharePoint, log, spSvc, next)
    }
    // Priority 3: Google Auth (legacy Google mode)
    return google.AuthenticateRequest(gwSvc, log, next)
}
```

### 6.3 Key Difference in OIDC ALB

`oktaalb` (hermes) has no bypass logic - all requests go through OIDC.
`oidcalb` (hermes-sharepoint) has `ShouldBypassOIDC()` to skip auth for `/addin/`, `/static/`, `/assets/`, `/ping`, `/favicon.ico`.

**Action:** Use `oidcalb` as the primary. Keep `oktaalb` for backward compat with existing configs.

---

## 7. API Endpoint Differences

### 7.1 Identical Endpoints (present in both, same handler signatures)

All v1 and v2 endpoints have the same route patterns. The differences are internal — SharePoint versions call `sharepointhelper` instead of `googleworkspace`.

### 7.2 New Endpoints in hermes-sharepoint

| Endpoint | Handler | Description |
|----------|---------|-------------|
| `/api/v2/groups` | `apiv2.GroupsHandler(srv)` | Search Microsoft distribution list groups |
| `/addin/` | `addin.AddinHandler(c.Log)` | Word Add-in static file serving |
| `/api/v2/drafts/{id}/archived` | `draftsArchivedHandler` (within drafts handler) | Archive/unarchive drafts |

### 7.3 Handler Signature Changes

hermes-sharepoint's `auth.AuthenticateRequest` has an extra parameter:
```go
// hermes:
auth.AuthenticateRequest(cfg, goog, log, handler)

// hermes-sharepoint:
auth.AuthenticateRequest(cfg, goog, sharepointSvc, log, handler)
```

**Action:** Use the SharePoint version (superset). Google-only deployments pass `nil` for `sharepointSvc`.

### 7.4 API v1 Handler Changes

Most v1 handlers in hermes take explicit parameters: `(cfg, log, algoSearch, algoWrite, goog, db)`.
hermes-sharepoint v1 handlers have the **same signature** — they haven't been refactored.

But hermes-sharepoint's **v2** handlers pass the `srv` (Server) struct which includes `SharePoint` field. The v2 handler implementations internally use `srv.SharePoint` for SharePoint-specific operations.

**v2 handlers must support both providers.** Each handler that differs uses the `if srv.SharePoint != nil` check:

```go
// Example pattern in v2 handler:
if srv.SharePoint != nil {
    // SharePoint path
    err = srv.SharePoint.CopyFile(ctx, fileID, destFolder, newName)
} else {
    // Google Workspace path (unchanged)
    err = srv.GWService.CopyFile(ctx, fileID, destFolder, newName)
}
```

**Internal handler changes in hermes-sharepoint v2 (key files):**

| File | Key Changes |
|------|-------------|
| `drafts.go` | Uses `srv.SharePoint.CopyFile()` instead of Google Drive copy |
| `drafts_shareable.go` | Uses `srv.SharePoint.ShareFile()` |
| `documents.go` | Uses `srv.SharePoint.MoveFile()` for publishing |
| `approvals.go` | Uses `srv.SharePoint.UpdateDocxCustomProperties()` |
| `reviews.go` | Uses `srv.SharePoint` for email via Microsoft Graph |
| `people.go` | Uses `srv.SharePoint.SearchPeople()` or falls back to `srv.GWService` |
| `groups.go` | NEW — uses `srv.SharePoint.SearchGroup()` |
| `me.go` | Uses `srv.SharePoint` for token validation |
| `drafts_archived.go` | NEW — archive functionality |

### 7.5 Merge Strategy for API Handlers

For each handler that differs, add a provider check:
```go
if srv.SharePoint != nil {
    // SharePoint path — uses doc.FileID
    fileID := sharepointFileID
    doc.FileID = &fileID
} else {
    // Google Workspace path (legacy, UNCHANGED) — uses doc.GoogleFileID
    doc.GoogleFileID = googleDriveFileID
}
```

For shared code that needs a file identifier regardless of provider:
```go
// Works for both Google and SharePoint documents
fileID := doc.GetFileIdentifier()
```

The hermes-sharepoint code already handles the `if srv.SharePoint != nil` pattern in some places. With Option A, Google code paths are **completely untouched** — they continue using `doc.GoogleFileID` directly without any awareness of `FileID`.

---

## 8. New Packages & Code to Merge

### 8.1 New Go Packages (copy from hermes-sharepoint)

| Package | Files | Description |
|---------|-------|-------------|
| `pkg/sharepointhelper/` | `service.go` (695 LOC), `document_operations.go` (1132 LOC), `docx_operations.go` (1051 LOC), `docx_operations_test.go`, `email_helper.go`, `groups_helper.go`, `people_helper.go` | Core SharePoint/Microsoft Graph client |
| `pkg/microsoftgraph/` | `service.go` (296 LOC), `docs_helpers.go` (408 LOC) | Microsoft Graph service (some overlap with sharepointhelper) |
| `internal/auth/microsoft/` | `microsoft.go` (357 LOC) | Microsoft OAuth2 middleware |
| `internal/auth/sharepoint/` | `sharepoint.go` | SharePoint token auth |
| `internal/auth/oidcalb/` | `doc.go`, `oidcalb.go` (226 LOC) | Generic OIDC ALB (replaces oktaalb) |
| `internal/middleware/` | `cors.go` (105 LOC) | CORS middleware for Office 365 |
| `internal/config/` | `auth.go`, `microsoft_auth.go`, `microsoft_graph.go` | Microsoft config structs |

### 8.2 Modified Go Files (diff required)

| File | Nature of Change |
|------|-----------------|
| `internal/db/db.go` | Add post-migration SQL after AutoMigrate: CHECK constraints + NOT NULL relaxation. Idempotent, runs on every startup. |
| `internal/auth/auth.go` | Add Microsoft + OIDC ALB auth paths |
| `internal/config/config.go` | Add SharePoint config block, Email retry, Server TLS, oidc_alb |
| `internal/server/server.go` | Add `SharePoint` field to Server struct |
| `internal/cmd/commands/server/server.go` | Add SharePoint init, TLS, CORS, addin route, oidc_alb |
| `pkg/models/document.go` | Add `FileID` (nullable), `Archived`, `GetFileIdentifier()` accessor. **Keep `GoogleFileID` unchanged.** |
| `pkg/models/document_file_revision.go` | **Use hermes-sharepoint's version directly.** PK = `(DocumentID, FileRevisionID, Name)`. `GoogleDriveFileRevisionID` becomes nullable non-PK. Matches SP production DB exactly — zero migration. |
| `pkg/models/indexer_folder.go` | Add `SharePointFolderID`, make `GoogleDriveID` nullable |
| `internal/api/v2/drafts.go` | Add SharePoint draft creation path |
| `internal/api/v2/documents.go` | Add SharePoint document operations |
| `internal/api/v2/approvals.go` | Add SharePoint approval (DOCX properties) |
| `internal/api/v2/reviews.go` | Add SharePoint email sending |
| `internal/api/v2/people.go` | Add SharePoint people search |
| `internal/api/v2/me.go` | Add SharePoint token validation |
| `internal/email/email.go` | Add Microsoft Graph email sending |
| `web/web.go` | May need changes for addin handler |

### 8.3 New Files to Copy (hermes-sharepoint → hermes)

| Source File | Destination |
|-------------|-------------|
| `hermes-plugin/` (entire directory) | `hermes-plugin/` |
| `internal/api/v2/drafts_archived.go` | `internal/api/v2/drafts_archived.go` |
| `internal/api/v2/groups.go` (if not present) | Already present in both |
| `internal/email/templates/contributor-added.html` | `internal/email/templates/contributor-added.html` |
| `internal/email/templates/stakeholder-added.html` | `internal/email/templates/stakeholder-added.html` |
| `certs/` (if needed for dev TLS) | `certs/` |
| `Dockerfile` | `Dockerfile` |

---

## 9. Frontend (Ember.js) Differences

### 9.1 Ember.js Version Gap

| Package | hermes | hermes-sharepoint |
|---------|--------|------------------|
| `ember-source` | ~3.28.10 | **~5.8.0** |
| `ember-cli` | ~3.28.6 | **~5.8.1** |
| `ember-data` | ~3.28.6 | **~5.3.3** |
| `@ember/test-helpers` | ^2.6.0 | **^3.3.0** |
| `ember-qunit` | ^5.1.5 | **^8.0.2** |
| `ember-resolver` | ^8.0.3 | **^11.0.1** |
| `ember-simple-auth` | ^5.0.0 | **7.1.3** |
| `ember-concurrency` | ^2.2.1 | **^4.0.6** |

**This is a MAJOR framework upgrade (Ember 3.28 → 5.8).** The frontend from hermes-sharepoint is essentially a full rewrite of the frontend dependencies.

### 9.2 New Frontend Dependencies (hermes-sharepoint only)

| Package | Version | Purpose |
|---------|---------|---------|
| `@babel/core` | ^7.26.0 | Required for Ember 5 |
| `@babel/eslint-parser` | ^7.26.0 | Babel-based ESLint |
| `@ember/string` | ^3.1.1 | String utils |
| `@ember-data/json-api` | ^5.8.0 | Ember Data JSON:API |
| `@ember-data/legacy-compat` | ^5.8.0 | Legacy compat for Ember Data 5 |
| `@ember-data/request` | ^5.8.0 | Request library |
| `@ember/test-waiters` | ^3.1.0 | Test waiters |
| `ember-cli-sass` | ^11.0.1 | SASS compilation |
| `sass` | ^1.94.0 | SASS compiler |
| `concurrently` | ^8.2.2 | Script runner |
| `tracked-built-ins` | ^3.3.0 | Tracked built-in types |
| `stylelint` | ^15.11.0 | CSS linter |
| `ember-power-select` | ^8.12.0 | Dropdown component |
| `postcss` | ^8.5.6 | CSS processing |

### 9.3 Removed Frontend Dependencies (hermes only, not in hermes-sharepoint)

| Package | Notes |
|---------|-------|
| `babel-eslint` | Replaced with `@babel/eslint-parser` |
| `ember-cli-terser` | Removed |
| `ember-export-application-global` | Removed (deprecated in Ember 5) |
| `ember-fetch` | Replaced with native fetch |
| `ember-maybe-import-regenerator` | Not needed with modern Babel |
| `postcss-scss` | Replaced with ember-cli-sass |
| `@csstools/postcss-sass` | Replaced with ember-cli-sass |
| `npm-run-all` | Replaced with `concurrently` |
| `eslint-plugin-node` | Replaced with `eslint-plugin-n` |

### 9.4 Frontend Strategy

**Use hermes-sharepoint's web/ directory entirely.** The Ember 3→5 upgrade is not something to incrementally merge. The hermes-sharepoint frontend was already upgraded and tested.

**Steps:**
1. Back up `hermes/web/` as `hermes/web-google-backup/` (temporarily)
2. Copy `hermes-sharepoint/web/` to `hermes/web/`
3. Ensure `web/web.go` is correct (embedded `dist/` serving)
4. Build and test
5. Remove the migration banners from hermes first, THEN replace the web/ directory

### 9.5 Frontend Component Differences (Key SharePoint-Specific Changes)

Due to Ember 5 upgrade, nearly EVERY component file differs. Key SharePoint-specific additions:
- Microsoft auth flow in authenticator
- SharePoint document creation/editing
- Group search (distribution lists) in reviewer selection
- Draft archiving UI
- Office 365 Add-in integration points
- CORS handling for Office iframe context

---

## 10. hermes-plugin (Word Add-In)

### 10.1 Overview
Entirely new directory, not present in hermes. This is a **React/TypeScript Office Word Add-in** that integrates as a sidebar in Microsoft Word.

### 10.2 Structure
```
hermes-plugin/
├── addin.go              ← Go file that embeds dist/ and serves /addin/ route
├── package.json          ← React + Office.js + FluentUI
├── webpack.config.js
├── manifest*.xml/json    ← Office Add-in manifests
├── src/
│   ├── taskpane/         ← Main UI (React components)
│   ├── commands/         ← Office ribbon commands
│   └── auth-callback.*   ← OAuth callback
```

### 10.3 Merge Action
- Copy `hermes-plugin/` into hermes, but **only keep `manifest.xml`** — delete the other 3 manifest files:
  - ❌ `manifest-addin-prod.xml` — production manifest with ~10 enterprise URLs, deployment-specific
  - ❌ `manifest-addin.xml` — alternate add-in manifest, not needed
  - ❌ `manifest.json` — JSON format manifest, not needed
  - ✅ `manifest.xml` — generic Office Add-in manifest (keep this one)
- The Makefile's `build` target must include `cd hermes-plugin && npm install && npm run build`
- The `addin.go` file uses `go:embed` to embed the built `dist/` directory
- Add `/addin/` route in server startup

### 10.4 Manifest Cleanup

**Do NOT copy `Add-In-PreProd.xml`** — this is a pre-production manifest in the hermes-sharepoint root and is not needed in the merged repo.

Only `manifest.xml` is copied (see 10.3). Clean up the enterprise-specific value in it:

| File | Enterprise Values to Replace |
|------|-----------------------------|
| `manifest.xml` | `https://www.hashicorp.com` AppDomain → remove or replace with `https://localhost:3000` |

> **Note:** Production manifests are deployment-specific. Developers create their own manifest with their instance URL when deploying.

---

## 11. Makefile & Build Changes

### 11.1 Differences

| Target | hermes | hermes-sharepoint | Action |
|--------|--------|------------------|--------|
| `build` | web/build → Go build | web/build → **plugin/build** → Go build | **Add plugin build step** |
| `build/linux` | Not present | web/build → plugin/build → Go linux build | **ADD** |
| `plugin/build` | Not present | `cd hermes-plugin && npm install && npm run build` | **ADD** |

### 11.2 Merged Makefile Changes
```makefile
.PHONY: build
build: web/build plugin/build
	rm -f ./hermes
	CGO_ENABLED=0 go build -o ./hermes ./cmd/hermes

.PHONY: build/linux
build/linux: web/build plugin/build
	rm -f ./hermes
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o ./hermes ./cmd/hermes

.PHONY: plugin/build
plugin/build:
	cd hermes-plugin && npm install && rm -rf dist/ && npm run build
```

**Decision: Always build the plugin.**

The `hermes-plugin/` directory is always present in the merged repo. The Makefile always builds it. This is the simplest approach — no conditional logic, no build tags, no stubs. The plugin build is fast (`npm install && npm run build`) and the resulting `dist/` is embedded into the Go binary via `go:embed`.

If a deployment doesn't need the Word Add-in, the `/addin/` route simply serves the built files — no harm, no extra config needed.

---

## 12. CI/CD Pipeline Differences

### 12.1 CI Workflow (`ci.yml`)

| Aspect | hermes | hermes-sharepoint |
|--------|--------|------------------|
| Triggers | PR + push to main | PR + push + **workflow_dispatch** |
| Go version | ^1.18 | **^1.21** |
| Node setup | actions/setup-node@v4 | actions/setup-node@v3 (pinned SHA) |
| Yarn setup | Removes .yarnrc.yml, uses corepack | Uses corepack + `make web/set-yarn-version` |
| Plugin build | Not present | Part of `make build/linux` |
| actions/checkout | @v3 | **@v3 (pinned SHA)** |

### 12.2 Docker Build Push (`docker-build-push.yml`)

Only in hermes-sharepoint. Contains enterprise-specific values that must be parameterized:

| Enterprise Value | Replacement |
|-----------------|-------------|
| `hashicorp/doormat-action@v1` | Remove — use standard `docker/login-action` |
| `team-hermes+artifactory-rw@hashicorp.com` | Remove — use GitHub Container Registry or configurable registry |
| Docker registry from `github.vars` | Use `ghcr.io/${{ github.repository }}` or configurable via repo vars |

**Action:** Copy to hermes, replace with generic Docker workflow:

```yaml
# .github/workflows/docker-build-push.yml (merged)
name: Docker Build & Push
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
```

> **Note:** If your deployment uses a private registry (Artifactory, ECR, etc.), update the login action and tags accordingly. The key point is removing the HashiCorp-specific `doormat-action` and service account.

### 12.3 Trigger Deploy (`trigger-deploy.yml`)

Present in both, similar structure. hermes-sharepoint uses different secrets.

### 12.4 Merged CI Strategy

```yaml
# ci.yml (merged)
- Setup Go ^1.24
- Setup Node 18 with corepack
- yarn install (web)
- make web/build
- npm install && npm run build (hermes-plugin)
- make bin/linux
- make go/test
- make web/test
```

---

## 13. Dockerfile Changes

hermes has no Dockerfile. hermes-sharepoint has:

```dockerfile
FROM docker.mirror.hashicorp.services/alpine:3.21.5  # ← Enterprise specific!
RUN apk add ca-certificates
WORKDIR /app
COPY hermes /app/hermes
COPY configs/ /app/configs/
ENTRYPOINT ["/app/hermes", "server"]
```

**Action:** Copy Dockerfile, change base image to public `alpine:3.21.5`.

---

## 14. Enterprise-Specific Information to Remove

### 14.1 Critical Items to Remove/Parameterize

| Location | What to Remove | Replacement |
|----------|---------------|-------------|
| `Dockerfile` | `docker.mirror.hashicorp.services/alpine:3.21.5` | `alpine:3.21.5` |
| `config.hcl` (root) | Hardcoded Algolia API keys | Placeholder `"YOUR_ALGOLIA_API_KEY"` |
| `config.hcl` (root) | `sharadmmmec@gmail.com` | `"your-email@example.com"` |
| `config.hcl` (root) | IBM OIDC URL (`preprod.login.w3.ibm.com`) | `"https://your-oidc-provider.com"` |
| `config.hcl` (root) | AWS ALB ARN | `"arn:aws:elasticloadbalancing:..."` |
| `config.hcl` (root) | SharePoint client_id/secret/tenant_id/site_id/drive_id | Placeholder values |
| `config.hcl` (root) | `ibm.com`, `yj62.onmicrosoft.com` domain | `"your-domain.com"` |
| `configs/config.hcl` | `https://go.hashi.co/hermes-support` | `""` or generic |
| `configs/config.hcl` | `https://go.hashi.co/when-to-rfc` | `""` or generic |
| `configs/config.hcl` | Google Form links / Drive links | Remove or generalize |
| `configs/config.hcl` | 56 HashiCorp-specific products | Keep only example products |
| `Add-In-PreProd.xml` | Pre-production manifest in hermes-sharepoint root | **Do NOT copy** — not needed in merged repo |
| `internal/middleware/cors.go` | `hashicorp.services` in prod CORS | Make configurable or remove |
| `.github/CODEOWNERS` | hermes: `@hashicorp-forge/labs`, hermes-sharepoint: `@hashicorp/team-scale-performance-eng` | Merge both: `* @hashicorp-forge/labs @hashicorp/team-scale-performance-eng` |
| `.github/workflows/docker-build-push.yml` | `doormat-action`, service account | Generic Docker login (see Section 12.2) |
| `.github/pull_request_template.md` | `github.com/hashicorp/hermes-sharepoint` | Update to correct repo |

### 14.2 Files to ARCHIVE (Migration/Development Artifacts)

**207 files/directories** in hermes-sharepoint root are migration artifacts. These have been moved to:
```
/Users/sharad.jaiswal/workspace/hermes-scripts/
```
This keeps them accessible for reference without polluting the merged repo.

Original list of archived items (from hermes-sharepoint root):

```
# Database dumps and SQL scripts
*.sql  (add_all_fks.sql, all migration SQL, insert SQL, etc.)
*.dump (hermes_source_backup_*.dump)

# Pre-production manifests (root-level)
Add-In-PreProd.xml

# Python migration scripts  
*.py   (analyze_users.py, compare_hermes_dbs.py, migrate_*.py, etc.)

# Migration documentation
MIGRATION_PLAN_14thJan2026/
Migration_Plan_19thJan/
final_migration_plan.md
FILEID_SOLUTION.md

# Data files
*.csv, *.txt, *.json (algolia exports, email lists, user data)
*.numbers (DL's for Hermes)

# Development artifacts
migration_test_env/
venv/
__pycache__/
.vscode/
*.log
indexer.log, indexer_new.log
dispatch_payload.json

# Internal documentation
HERMES_PROPERTY_MANAGEMENT.md
IMPLEMENTATION_SUMMARY.md
SECURITY_VULNERABILITY_ASSESSMENT.md
SHAREPOINT_ENVIRONMENT_SETUP.md
TIER_BENCHMARKING_EXECUTION_PLAN.md
VERSION_MIGRATION_GUIDE.md
QUICK_REFERENCE.md
EMAIL_COMPARISON_LOCATIONS.md
document_operations_overview.md
user_attribution_operations.md
performance-benchmarking-plan.md
flow-diagrams-and-architecture.md  (not repo-relevant)
hashicorp-performance-testing-research.md  (not repo-relevant)

# Workspace files
hermes-sharepoint.code-workspace
prod_cfg_old_hermes
```

---

## 15. Files to NOT Merge (Junk/Migration Artifacts)

See Section 14.2 above. **207 files/directories** in hermes-sharepoint root were migration artifacts and have been moved to `/Users/sharad.jaiswal/workspace/hermes-scripts/`. Only the application code should be merged.

**Clean list of directories/files to merge from hermes-sharepoint:**
```
cmd/              → Replace
configs/          → Merge (use sharepoint version as base, add sample Google config)
hermes-plugin/    → Copy entirely (new)
internal/         → Merge file-by-file
pkg/              → Merge file-by-file
web/              → Replace entirely
.github/          → Merge
Dockerfile        → Copy
Makefile          → Merge
docker-compose.yml → Keep hermes version (identical)
go.mod            → Merge (use sharepoint version + go mod tidy)
go.sum            → Regenerate via go mod tidy
.gitignore        → Merge
.yarnrc.yml       → Use sharepoint version
LICENSE           → Keep hermes version
README.md         → Rewrite (hermes-sharepoint has none)
```

---

## 16. Minimizing Google Hermes Maintenance Pain

### Goal: Zero-touch for Google Hermes when making SharePoint changes

### 16.1 Provider Interface Pattern

Define a `DocumentProvider` interface that both Google and SharePoint implement:

```go
// pkg/provider/provider.go
type DocumentProvider interface {
    CreateDraft(ctx context.Context, title, templateID string) (fileID string, err error)
    GetDocument(ctx context.Context, fileID string) (*Document, error)
    CopyFile(ctx context.Context, fileID, destFolder, newName string) (string, error)
    MoveFile(ctx context.Context, fileID, destFolder string) error
    ShareFile(ctx context.Context, fileID string, emails []string) error
    SearchPeople(ctx context.Context, query string) ([]Person, error)
    SearchGroups(ctx context.Context, query string) ([]Group, error)
    SendEmail(ctx context.Context, to []string, subject, body string) error
}
```

**Note: This is a FUTURE improvement.** For the initial merge, the simpler `if srv.SharePoint != nil` check is sufficient and avoids refactoring working Google code.

### 16.2 What Guarantees Google Won't Break

1. **Dual-field model pattern:** `GoogleFileID` is untouched — same name, same type. Google code references `doc.GoogleFileID` directly and never sees `FileID`. **Exception: `DocumentFileRevision`** — PK changes from `GoogleDriveFileRevisionID` to `FileRevisionID` to match the SP production DB. Google handler code referencing `GoogleDriveFileRevisionID` as PK (~12 occurrences across 7 files + ~13 test occurrences) is updated **during the merge** to ensure the code compiles and tests pass.

2. **Go type system:** If a shared model changes (e.g., `Document` struct), both backends must compile. Adding fields is safe (backward compatible). The dual-field approach is purely additive — nothing was removed or renamed.

3. **Single CI pipeline:** `go test ./...` runs ALL tests, including Google-specific ones. If SharePoint changes break a Google test, CI fails.

4. **No touching Google code:** SharePoint-specific changes go in SharePoint-specific files (`pkg/sharepointhelper/`, `internal/auth/microsoft/`, etc.) or behind `if srv.SharePoint != nil` guards. Google code paths are **never modified**.

5. **Shared code changes require both-backend testing:** If you change a shared file (e.g., `pkg/models/document.go`), both backends' tests must pass.

6. **Database matches SP production:** The `document_file_revisions` table already has the correct PK `(document_id, file_revision_id, name)` in the SP production DB — zero migration needed. Other tables get additive-only changes via GORM AutoMigrate (`file_id`, `archived`, `share_point_folder_id`). No destructive schema changes for the SP deployment.

### 16.3 What Could Still Break Google

| Risk | Mitigation |
|------|-----------|
| Web frontend changes | Frontend is already SharePoint-specific (Ember 5). Google frontend stays as-is in the last-known-good state. Consider having a `web-google/` backup if needed. |
| Database schema additions | GORM AutoMigrate only adds — never removes columns. New SharePoint columns are nullable with defaults. Google deployments are unaffected. |
| Config changes | Google config files don't include `sharepoint {}` block. Config parsing is additive — `SharePoint` defaults to `nil`. |
| Dependency upgrades | Rare risk. `go mod tidy` + `go build ./...` + `go test ./...` catch everything. |

### 16.4 Recommended CI Matrix

```yaml
# In CI, test both modes:
jobs:
  test-sharepoint:
    steps:
      - run: go test ./...
      
  test-google-build:
    steps:
      - run: go build ./...   # Just verify Google code still compiles
      # Full Google tests only if pkg/models/ or internal/api/ changed
```

---

## 17. Testing Plan

### 17.1 Pre-Merge Testing

| Test | Command | Expected |
|------|---------|----------|
| hermes Go build | `cd hermes && go build ./...` | Compiles |
| hermes Go tests | `cd hermes && go test ./...` | Passes |
| hermes-sharepoint Go build | `cd hermes-sharepoint && go build ./...` | Compiles |
| hermes-sharepoint Go tests | `cd hermes-sharepoint && go test ./...` | Passes |
| hermes web build | `cd hermes/web && yarn install && yarn build` | Builds |
| hermes-sharepoint web build | `cd hermes-sharepoint/web && yarn install && yarn build` | Builds |

### 17.2 Post-Merge Testing

| Test | How |
|------|-----|
| Go compilation | `go build ./...` — must compile with all new packages |
| Go tests | `go test ./...` — all existing + new tests pass |
| Web build | `cd web && yarn install && yarn build` — Ember 5 builds |
| Plugin build | `cd hermes-plugin && npm install && npm run build` — Add-in builds |
| Full build | `make build` — entire artifact builds |
| Linux build | `make build/linux` — cross-compilation works |
| DB migration | Start with empty DB, ensure AutoMigrate creates all tables |
| Config loading | Test loading Google-only config and SharePoint-only config |
| Deprecation banner removed | Visual verification — no migration banners |

### 17.3 Integration Tests (Manual)

| Scenario | Steps |
|----------|-------|
| Google mode startup | Configure Google config.hcl → start server → verify auth via Google OAuth |
| SharePoint mode startup | Configure SharePoint config.hcl → start server → verify auth via Microsoft |
| Document creation (SP) | Create draft via API → verify file in SharePoint |
| Document creation (Google) | Create draft via API → verify file in Google Drive |
| Add-in loading | Open Word → load add-in → verify sidebar renders |

---

## 18. Merge Execution Order

### Phase 1: Pre-Merge (hermes repo only)
1. Create branch `merge/sharepoint-into-hermes`
2. Remove deprecation banners (Section 1.2)
3. Commit: "Remove migration/deprecation banners"
4. Verify hermes builds and tests pass

### Phase 2: Backend Merge
5. Upgrade `go.mod` to Go 1.24.0 and update dependency versions
6. Run `go mod tidy`
7. Add new packages: `pkg/sharepointhelper/`, `pkg/microsoftgraph/`, `internal/auth/microsoft/`, `internal/auth/sharepoint/`, `internal/auth/oidcalb/`, `internal/middleware/`
8. Add new config files: `internal/config/auth.go`, `microsoft_auth.go`, `microsoft_graph.go`
9. Update `internal/config/config.go` (add SharePoint, Email, Server fields)
10. Update `internal/server/server.go` (add SharePoint field)
11. Update `internal/auth/auth.go` (add Microsoft + OIDC ALB paths)
12. Update `internal/cmd/commands/server/server.go` (SharePoint init, CORS, TLS, addin)
13. Update `internal/db/db.go` (add post-migration SQL for CHECK constraints + NOT NULL relaxation)
14. Update models (additive for Document/IndexerFolder, use SP model for DocumentFileRevision):
    - `document.go`: Add `FileID *string` (nullable), `Archived bool`, `GetFileIdentifier()` method. **Keep `GoogleFileID` unchanged.**
    - `document_file_revision.go`: **Use hermes-sharepoint's version.** PK = `(DocumentID, FileRevisionID, Name)`. `GoogleDriveFileRevisionID` is nullable non-PK. Matches SP production DB — zero migration.
    - `indexer_folder.go`: Add `SharePointFolderID`, make `GoogleDriveID` nullable
15. **Update Google handler code for `DocumentFileRevision` PK change** (~12 non-test + ~13 test occurrences):
    - `approvals.go`, `reviews.go`: Set `FileRevisionID: latestRev.Id` + `GoogleDriveFileRevisionID: &latestRev.Id`
    - `helpers.go` (v1 + v2): Read `fr.FileRevisionID` instead of `fr.GoogleDriveFileRevisionID`
    - `pkg/document/document.go`: Use `FileRevisionID` for reads/creates
    - `migrate_algolia_to_postgresql.go`: Set `FileRevisionID` in migration
    - Test files (3 files, ~13 occurrences): Update test data
16. Merge API handler changes (v2 handlers with SharePoint paths)
17. Add `internal/api/v2/drafts_archived.go`
18. Add new email templates
19. Commit: "Add SharePoint backend support"

### Phase 3: Frontend Merge
20. Replace `web/` entirely with hermes-sharepoint's `web/`
21. Copy `hermes-plugin/` — keep only `manifest.xml`, delete `manifest-addin-prod.xml`, `manifest-addin.xml`, `manifest.json`
22. Clean up enterprise URL in `manifest.xml` (Section 10.4)
23. Update Makefile (add plugin build steps — always build the plugin)
24. Commit: "Upgrade frontend to Ember 5 + add Word Add-in"

### Phase 4: Infra & CI
25. Add/update `Dockerfile` (use public `alpine:3.21.5`, not enterprise mirror)
26. Update `.github/workflows/ci.yml`
27. Add `.github/workflows/docker-build-push.yml` (generic Docker login, see Section 12.2)
28. Merge `.github/CODEOWNERS` (`* @hashicorp-forge/labs @hashicorp/team-scale-performance-eng`)
29. Update `configs/config.hcl` (template with both backends documented)
30. Commit: "Update CI/CD and configuration"

### Phase 5: Cleanup
31. Remove enterprise-specific values (Section 14)
32. Verify `Add-In-PreProd.xml` was NOT copied
33. Update `README.md`
34. Remove junk files if any were accidentally copied
35. Run full test suite: `go build ./...` && `go test ./...`
36. Commit: "Clean up enterprise-specific values and update docs"

---

## 19. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|-----------|
| Ember 3→5 upgrade breaks Google frontend | High | High | Use SharePoint frontend only. Google frontend is frozen. |
| ~~`GoogleFileID` → `FileID` rename breaks Google API handlers~~ | ~~High~~ | ~~Medium~~ | **ELIMINATED by Option A** — Google field kept unchanged |
| ~~Database migration corrupts existing data~~ | ~~High~~ | ~~Low~~ | **ELIMINATED by Option A** — additive-only migration, no data manipulation |
| Primary key change on `DocumentFileRevision` | Medium | **Certain** | PK changes from `(document_id, google_drive_file_revision_id, name)` → `(document_id, file_revision_id, name)` to match SP production DB. **All ~25 Google handler/test refs updated during the merge** to ensure compilation and tests pass. See Section 20 for DB migration guide. |
| Auth changes break existing Google deployment | Medium | Medium | Keep `oktaalb` package alongside `oidcalb` for backward compat |
| `hermes-plugin` build adds complexity to CI | Low | High | Always build the plugin; simple npm install + build |
| Dependency upgrades introduce breaking changes | Medium | Low | All deps have minor/patch upgrades only |
| CORS middleware blocks Google deployment requests | Medium | Low | Google deployments don't need CORS (no Office 365 iframes) |
| Config parsing breaks with new fields | Low | Low | All new fields are `optional` — existing configs still parse |
| Future dev confuses dual fields (`GoogleFileID` + `FileID`) | Low | Medium | Documented in README + code comments. `GetFileIdentifier()` accessor makes intent clear. |

---

## 20. Deployment Scenarios & Migration Guide

The merged codebase uses hermes-sharepoint's `DocumentFileRevision` model (PK = `file_revision_id`). This section covers what happens when deploying against every possible database state.

### 20.1 SharePoint Deployments

#### Scenario A: Fresh SharePoint (empty DB)

| Aspect | Detail |
|--------|--------|
| **Risk** | **None** |
| **DB migration** | None — GORM AutoMigrate creates all tables from the merged model |
| **Code changes** | None — SP code already uses `FileRevisionID` |
| **`document_file_revisions`** | Created as: PK `(document_id, file_revision_id, name)`, `google_drive_file_revision_id` nullable |
| **`documents`** | Created with both `google_file_id` (nullable) and `file_id` (nullable). CHECK constraint ensures at least one is set. |
| **`indexer_folders`** | Created with both `google_drive_id` (nullable) and `share_point_folder_id` (nullable). CHECK constraint ensures at least one is set. |

**Result: Works out of the box. No action needed.**

#### Scenario B: Existing SharePoint DB (current target — `hermesdb_new`)

| Aspect | Detail |
|--------|--------|
| **Risk** | **Very Low** |
| **DB migration** | Additive only for `documents` and `indexer_folders`. Zero for `document_file_revisions`. |
| **Code changes** | None — SP code already uses `FileRevisionID` |

**`document_file_revisions`:** Zero migration. The SP production DB already has exactly the schema the merged model expects:
```
PK: (document_id, file_revision_id, name)
google_drive_file_revision_id text (nullable)
```
GORM AutoMigrate sees no diff → does nothing.

**`documents`:** GORM AutoMigrate adds `google_file_id` (nullable) column. Post-migration SQL in `NewDB()` handles the rest automatically:
- `DROP NOT NULL` on `google_file_id` (idempotent — silently skips if already nullable)
- `ADD CONSTRAINT chk_document_has_file_id` (idempotent — silently skips if already exists)

**No manual steps required.**

**`indexer_folders`:** GORM AutoMigrate adds `google_drive_id` (nullable) column if missing. Post-migration SQL in `NewDB()` handles:
- `DROP NOT NULL` on `google_drive_id` (idempotent)
- `ADD CONSTRAINT chk_folder_has_id` (idempotent)

**No manual steps required.**

**Result: Deploy with confidence. Existing SP data is untouched.**

---

### 20.2 Google Deployments

#### Scenario C: Fresh Google (empty DB)

| Aspect | Detail |
|--------|--------|
| **Risk** | **Low** — code changes already done during merge |
| **DB migration** | None — GORM AutoMigrate creates correct schema from merged model |
| **Code changes** | **Already done** — ~12 non-test + ~13 test refs updated in merge step 15 |

**Problem (already solved in the merge):** The merged model has `FileRevisionID string` as PK (NOT NULL). The original Google handler code set `GoogleDriveFileRevisionID` but never set `FileRevisionID`. This was fixed during the merge (step 15) — all Google handlers now set both fields:

```go
// CURRENT Google code (BROKEN with merged model):
rev := models.DocumentFileRevision{
    GoogleDriveFileRevisionID: latestRev.Id,  // ← now nullable non-PK
    // FileRevisionID is "" (empty string) — PK collision on 2nd insert!
}

// FIXED Google code:
rev := models.DocumentFileRevision{
    FileRevisionID:            latestRev.Id,           // ← PK, required
    GoogleDriveFileRevisionID: &latestRev.Id,          // ← nullable, preserved for queries
    // ...
}
```

**Files requiring changes:**

| File | Lines | Change |
|------|-------|--------|
| `pkg/models/document_file_revision.go` | Struct + Create() + Get() | Already correct (uses merged model). Validate `FileRevisionID` not empty. |
| `internal/api/v2/approvals.go` | ~L182, ~L490 | Set `FileRevisionID: latestRev.Id` and `GoogleDriveFileRevisionID: &latestRev.Id` |
| `internal/api/v2/reviews.go` | ~L338 | Same pattern |
| `internal/api/v2/helpers.go` | ~L416 | Read `fr.FileRevisionID` instead of `fr.GoogleDriveFileRevisionID` |
| `internal/api/helpers.go` | ~L415 | Same (v1 version) |
| `pkg/document/document.go` | ~L351, ~L531 | Read/create using `FileRevisionID` |
| `internal/cmd/.../migrate_algolia_to_postgresql.go` | ~L379, ~L389 | Set `FileRevisionID` in migration |
| Test files (3 files) | ~13 occurrences | Update test data to set `FileRevisionID` |

**Result: Works out of the box. All code changes were done during the merge.**

#### Scenario D: Existing Google DB (upgrade to merged code) ⚠️ HIGHEST RISK

| Aspect | Detail |
|--------|--------|
| **Risk** | **HIGH** — PK swap on live table |
| **DB migration** | **Manual 6-step SQL** (see below) |
| **Code changes** | **Already done** — same ~25 code changes from merge step 15 |
| **Downtime** | **Required** — PK swap cannot be done without brief downtime |

**Problem:** Existing Google DB has:
```
PK: (document_id, google_drive_file_revision_id, name)
-- NO file_revision_id column
```

Merged model expects:
```
PK: (document_id, file_revision_id, name)
google_drive_file_revision_id text (nullable, non-PK)
```

**GORM AutoMigrate CANNOT handle this** — it never alters PKs or relaxes NOT NULL constraints on existing columns.

**Required manual migration (run BEFORE deploying merged code):**

```sql
-- ============================================================
-- Google DB → Merged Model Migration
-- REQUIRES DOWNTIME. Test on a backup first!
-- ============================================================

BEGIN;

-- Step 1: Add the new PK column
ALTER TABLE document_file_revisions
  ADD COLUMN file_revision_id TEXT;

-- Step 2: Copy Google revision IDs into the new column
-- (Google Drive revision IDs become the file_revision_id values)
UPDATE document_file_revisions
  SET file_revision_id = google_drive_file_revision_id;

-- Step 3: Make it NOT NULL (safe — every row now has a value)
ALTER TABLE document_file_revisions
  ALTER COLUMN file_revision_id SET NOT NULL;

-- Step 4: Swap primary key
ALTER TABLE document_file_revisions
  DROP CONSTRAINT document_file_revisions_pkey;
ALTER TABLE document_file_revisions
  ADD PRIMARY KEY (document_id, file_revision_id, name);

-- Step 5: Relax google_drive_file_revision_id (was PK/NOT NULL → nullable)
ALTER TABLE document_file_revisions
  ALTER COLUMN google_drive_file_revision_id DROP NOT NULL;

COMMIT;

-- Step 6: Verify (run outside transaction)
SELECT count(*) AS mismatches
  FROM document_file_revisions
  WHERE file_revision_id != google_drive_file_revision_id;
-- Expected: 0 (every Google row has identical values in both columns)

SELECT count(*) AS null_check
  FROM document_file_revisions
  WHERE file_revision_id IS NULL;
-- Expected: 0
```

**Also needed for `documents` and `indexer_folders` tables:**
These are handled **automatically** by the post-migration SQL in `NewDB()` (see Section 4.2) on first startup. The `DROP NOT NULL`, `ADD COLUMN`, and `ADD CONSTRAINT` statements are all idempotent. No manual SQL needed for these tables.

> **Only the `document_file_revisions` PK swap (Steps 1-6 above) requires manual intervention.** Everything else is automated.

**Deployment steps for Scenario D:**
1. Take a DB backup
2. Stop the application
3. Run the `document_file_revisions` PK swap SQL (Steps 1-6 above) **manually**
4. Run verification queries (Step 6)
5. Deploy merged code (code changes already included in the merge)
6. Start the application — `NewDB()` runs AutoMigrate (adds columns) + post-migration SQL (CHECK constraints, NOT NULL relaxation) automatically
7. Verify application health

**Result: Works after DB migration. Code changes are already in the merged codebase. Requires planned downtime for the PK swap only.**

---

### 20.3 Mixed / Dual Deployments

#### Scenario E: Deploy merged code against a DB that previously ran both providers

This shouldn't exist today (no deployment has run both providers), but could happen in the future.

| Aspect | Detail |
|--------|--------|
| **Risk** | Same as whichever provider was deployed last |
| **Rule** | If the DB has `google_drive_file_revision_id` as PK → treat as Scenario D. If `file_revision_id` as PK → treat as Scenario B. |

**How to check:**
```sql
SELECT constraint_name, column_name
  FROM information_schema.key_column_usage
  WHERE table_name = 'document_file_revisions'
    AND constraint_name = 'document_file_revisions_pkey'
  ORDER BY ordinal_position;
```

#### Scenario F: Switch an SP deployment to Google (or vice versa)

The merged code supports both — just change the config. Data considerations:
- Existing SP documents have `file_id` set, `google_file_id` NULL
- New Google documents will have `google_file_id` set, `file_id` NULL
- Both coexist in the same table thanks to the CHECK constraint
- `document_file_revisions` works for both: Google sets `FileRevisionID` = Drive revision ID + `GoogleDriveFileRevisionID` pointer; SP sets `FileRevisionID` = SP revision ID, `GoogleDriveFileRevisionID` = NULL

---

### 20.4 Quick Reference Matrix

> **Note:** All code changes are done during the merge (step 15). The "Code Changes" column below refers to whether additional code changes are needed **beyond the merge** for that deployment scenario.

| Scenario | DB State | DB Migration | Additional Code Changes | Risk | Downtime |
|----------|----------|-------------|------------------------|------|----------|
| **A.** Fresh SP | Empty | None (AutoMigrate) | None | None | No |
| **B.** Existing SP | SP schema | Additive only (automated via `NewDB()`) | None | Very Low | No |
| **C.** Fresh Google | Empty | None (AutoMigrate) | None (already in merge) | **Low** | No |
| **D.** Existing Google | Google schema | **Manual PK swap** only (rest automated) | None (already in merge) | **High** | **Yes** (PK swap) |
| **E.** Mixed DB | Check PK | Depends on current PK | None (already in merge) | Varies | Depends |
| **F.** Provider switch | Either | None (additive columns exist) | None (config change only) | Low | No |

---

## Appendix A: Full File Diff Map

### Files to ADD (copy from hermes-sharepoint)
```
pkg/sharepointhelper/service.go
pkg/sharepointhelper/document_operations.go
pkg/sharepointhelper/docx_operations.go
pkg/sharepointhelper/docx_operations_test.go
pkg/sharepointhelper/email_helper.go
pkg/sharepointhelper/groups_helper.go
pkg/sharepointhelper/people_helper.go
pkg/microsoftgraph/service.go
pkg/microsoftgraph/docs_helpers.go
internal/auth/microsoft/microsoft.go
internal/auth/sharepoint/sharepoint.go
internal/auth/oidcalb/doc.go
internal/auth/oidcalb/oidcalb.go
internal/middleware/cors.go
internal/config/auth.go
internal/config/microsoft_auth.go
internal/config/microsoft_graph.go
internal/api/v2/drafts_archived.go
internal/email/templates/contributor-added.html
internal/email/templates/stakeholder-added.html
hermes-plugin/ (entire directory)
Dockerfile
```

### Files to MODIFY (merge changes)
```
go.mod
internal/config/config.go
internal/config/helpers.go
internal/db/db.go
internal/server/server.go
internal/auth/auth.go
internal/cmd/commands/server/server.go
internal/api/v2/drafts.go
internal/api/v2/drafts_shareable.go
internal/api/v2/documents.go
internal/api/v2/approvals.go
internal/api/v2/reviews.go
internal/api/v2/people.go
internal/api/v2/me.go
internal/api/v2/helpers.go
internal/email/email.go
pkg/models/document.go
pkg/models/document_file_revision.go
pkg/models/indexer_folder.go
Makefile
.github/workflows/ci.yml
.gitignore
configs/config.hcl
```

### Files to REPLACE (use hermes-sharepoint version entirely)
```
web/ (entire directory)
.yarnrc.yml
```

### Files to KEEP (hermes version, no changes)
```
cmd/hermes/main.go
internal/api/ (v1 handlers — keep as-is for Google compat)
internal/auth/google/
internal/auth/oktaalb/
internal/cmd/commands/indexer/
internal/cmd/commands/operator/
internal/cmd/commands/version/
internal/datadog/
internal/db/
internal/helpers/
internal/indexer/
internal/jira/
internal/pub/
internal/structs/
internal/test/
internal/version/
pkg/algolia/
pkg/document/
pkg/googleworkspace/
pkg/hashicorpdocs/
pkg/links/
pkg/models/ (other unchanged models)
LICENSE
docker-compose.yml
```
