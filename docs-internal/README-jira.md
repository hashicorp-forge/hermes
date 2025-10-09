# Jira Integration

This guide covers integrating Hermes with Jira for project management.

## Overview

Jira integration provides:
- **Project linking**: Connect Hermes projects with Jira issues
- **Two-way sync**: View Jira issue details in Hermes
- **Traceability**: Link documents to development work
- **Workflow alignment**: Track project status across systems

## When to Use Jira Integration

**Use Jira integration if**:
- Your team uses Jira for project management
- You want to link documents (RFCs, PRDs) with Jira epics/stories
- You need visibility into related development work
- You want to track document-to-implementation workflow

**Skip Jira integration if**:
- You don't use Jira
- You use a different project management tool
- You only need document management without project tracking

## Jira Versions Supported

Hermes supports both:
- **Jira Cloud**: Atlassian-hosted SaaS
- **Jira Data Center**: Self-hosted enterprise version

Configuration differs between versions (see Configuration section).

## Setup Steps

### 1. Create API Token

**For Jira Cloud**:

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Give it a name (e.g., "Hermes Integration")
4. Copy the token (you won't see it again!)

See: [Manage API tokens for your Atlassian account](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/#Create-an-API-token)

**For Jira Data Center**:

1. Go to your Jira instance
2. Navigate to **Profile** → **Personal Access Tokens**
3. Click **Create token**
4. Set name and expiration
5. Copy the token

### 2. Gather Connection Details

You'll need:

**For Jira Cloud**:
- **Base URL**: Your Jira Cloud URL (e.g., `https://yourcompany.atlassian.net`)
- **Email**: Your Atlassian account email
- **API Token**: Token from step 1

**For Jira Data Center**:
- **Base URL**: Your self-hosted Jira URL (e.g., `https://jira.yourcompany.com`)
- **Personal Access Token**: Token from step 1
- **Email**: Not required for Data Center

## Configuration

### Jira Cloud Configuration

Add to your `config.hcl`:

```hcl
jira {
  enabled = true
  
  # Jira Cloud
  base_url  = "https://yourcompany.atlassian.net"
  user_email = "your-email@yourcompany.com"
  api_token  = "your-api-token-here"
}
```

### Jira Data Center Configuration

Add to your `config.hcl`:

```hcl
jira {
  enabled = true
  
  # Jira Data Center
  base_url              = "https://jira.yourcompany.com"
  personal_access_token = "your-personal-access-token-here"
}
```

### Environment Variables (Recommended)

For security, use environment variables:

```bash
# Jira Cloud
export HERMES_JIRA_ENABLED="true"
export HERMES_JIRA_BASE_URL="https://yourcompany.atlassian.net"
export HERMES_JIRA_USER_EMAIL="your-email@yourcompany.com"
export HERMES_JIRA_API_TOKEN="your-api-token"

# Jira Data Center
export HERMES_JIRA_ENABLED="true"
export HERMES_JIRA_BASE_URL="https://jira.yourcompany.com"
export HERMES_JIRA_PERSONAL_ACCESS_TOKEN="your-token"
```

Then in `config.hcl`:

```hcl
jira {
  enabled = true
  # Values read from environment variables
}
```

## Features

### Project-Issue Linking

**In Hermes**:
1. Create or edit a project
2. Enter Jira issue key (e.g., `PROJ-123`)
3. Save project
4. Hermes fetches and displays:
   - Issue title
   - Issue status
   - Issue type
   - Link to Jira issue

### Issue Details Display

When a project has a linked Jira issue, Hermes shows:
- **Issue Key**: Clickable link to Jira
- **Summary**: Issue title
- **Status**: Current workflow status
- **Type**: Issue type (Epic, Story, Bug, etc.)
- **Last Updated**: When the issue was modified

### Automatic Sync

Hermes periodically syncs with Jira to keep issue details current:
- Status updates
- Title changes
- Issue type changes

## API Endpoints

### Backend API

**Get Jira issue details**:
```
GET /api/v2/jira/issues/{issueKey}
```

Example:
```bash
curl -H "Authorization: Bearer $TOKEN" \
     https://hermes.yourcompany.com/api/v2/jira/issues/PROJ-123
```

Response:
```json
{
  "key": "PROJ-123",
  "fields": {
    "summary": "Implement new feature",
    "status": {
      "name": "In Progress"
    },
    "issuetype": {
      "name": "Epic"
    }
  }
}
```

### Rate Limiting

Jira APIs have rate limits:

**Jira Cloud**:
- Free/Standard: 10 requests per second
- Premium/Enterprise: Higher limits

**Jira Data Center**:
- Depends on server configuration
- Typically higher than Cloud

Hermes implements automatic retry with exponential backoff.

## Permissions

### Required Jira Permissions

The Jira account used for integration needs:

**Minimum**:
- **Browse Projects**: View issues
- **View Issues**: Read issue details

**Recommended**:
- Same permissions as above
- Read access to all projects you want to link

### Granting Permissions

**Jira Cloud**:
1. Go to **Project Settings** → **People**
2. Add the user to the project
3. Grant "Browse Projects" role

**Jira Data Center**:
1. Go to **Administration** → **System** → **Global Permissions**
2. Grant "Browse Projects" to the user/group
3. Or configure project-specific permissions

## Troubleshooting

### API Token Authentication Failed

**Cause**: Invalid credentials or wrong authentication method

**Solution**:
```bash
# Test Jira Cloud authentication
curl -u "your-email@yourcompany.com:your-api-token" \
     https://yourcompany.atlassian.net/rest/api/3/myself

# Test Jira Data Center authentication
curl -H "Authorization: Bearer your-personal-access-token" \
     https://jira.yourcompany.com/rest/api/2/myself

# Check Hermes logs
grep -i jira /tmp/hermes-backend.log
```

### Issue Not Found

**Cause**: Issue doesn't exist or user lacks permissions

**Solution**:
1. Verify issue key is correct (case-sensitive!)
2. Check user has "Browse Projects" permission
3. Verify project exists and is accessible
4. Try accessing issue in Jira web UI with same account

### SSL Certificate Errors

**Cause**: Self-signed certificates on Jira Data Center

**Solution**:
```hcl
jira {
  enabled = true
  base_url = "https://jira.yourcompany.com"
  personal_access_token = "your-token"
  
  # Skip SSL verification (NOT recommended for production!)
  insecure_skip_verify = true
}
```

**Better solution**: Add your CA certificate to system trust store.

### Connection Timeout

**Cause**: Network issues or firewall blocking

**Solution**:
```bash
# Test connectivity
curl -v https://yourcompany.atlassian.net
curl -v https://jira.yourcompany.com

# Check firewall rules
# Ensure Hermes can reach Jira on port 443

# Increase timeout in config.hcl
jira {
  enabled = true
  timeout = "30s"  # Default is 10s
}
```

### Rate Limit Exceeded

**Cause**: Too many API calls to Jira

**Solution**:
1. Hermes automatically retries with backoff
2. Check logs for excessive requests
3. Contact Atlassian support to increase limits (Cloud)
4. Optimize query patterns in custom code

## Security Considerations

### API Token Storage

**Do NOT**:
- ❌ Commit API tokens to git
- ❌ Share tokens in documentation
- ❌ Use personal tokens for shared accounts

**Do**:
- ✅ Use environment variables
- ✅ Rotate tokens regularly
- ✅ Use dedicated service accounts
- ✅ Store in secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)

### Service Account Recommendations

**For production**:
1. Create dedicated Jira service account (e.g., `hermes-integration@yourcompany.com`)
2. Grant minimum required permissions
3. Generate API token for that account
4. Use that token in Hermes configuration
5. Monitor and audit token usage

### Token Rotation

**Best practice**: Rotate API tokens every 90 days

```bash
# 1. Generate new token in Jira
# 2. Update environment variable
export HERMES_JIRA_API_TOKEN="new-token-here"

# 3. Restart Hermes
./hermes server -config=config.hcl

# 4. Verify integration works
curl -H "Authorization: Bearer $TOKEN" \
     https://hermes.yourcompany.com/api/v2/jira/issues/TEST-1

# 5. Revoke old token in Jira
```

## Advanced Configuration

### Proxy Support

If Jira is behind a proxy:

```hcl
jira {
  enabled = true
  base_url = "https://yourcompany.atlassian.net"
  api_token = "your-token"
  
  # HTTP proxy
  http_proxy = "http://proxy.yourcompany.com:8080"
  
  # HTTPS proxy
  https_proxy = "http://proxy.yourcompany.com:8080"
  
  # No proxy for these hosts
  no_proxy = "localhost,127.0.0.1"
}
```

### Custom Fields

To display custom Jira fields in Hermes:

1. Identify custom field IDs in Jira:
   ```bash
   curl -u "email:token" \
        https://yourcompany.atlassian.net/rest/api/3/field
   ```

2. Modify Hermes code to fetch and display custom fields
3. See `internal/jira/client.go` for implementation

### Multiple Jira Instances

To support multiple Jira instances:

1. Create separate config profiles
2. Use different environment variable prefixes
3. Implement custom routing logic in code

Currently, Hermes supports one Jira instance per configuration.

## Alternatives

If you don't use Jira, consider:

- **Manual linking**: Add Jira URLs in document content
- **Custom integration**: Build integration with your PM tool
- **GitHub Issues**: Similar integration pattern
- **Linear**: Another project management tool that could be integrated

## See Also

- [Configuration Documentation](CONFIG_HCL_DOCUMENTATION.md)
- [API Documentation](../internal/api/v2/)
- [Jira REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Jira Data Center API](https://docs.atlassian.com/software/jira/docs/api/REST/latest/)
