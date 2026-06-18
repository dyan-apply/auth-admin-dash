# OIDC Clients Data

This directory contains OAuth2/OIDC client configuration data automatically fetched from Ping Identity environments.

## Files

- `oidc-clients-staging.json` - OAuth2 clients from staging environment
- `oidc-clients-prod.json` - OAuth2 clients from production environment

## Data Structure

Each JSON file contains an array of client configurations with the following fields:

```json
[
  {
    "id": "client-id-here",
    "redirectionUris": [
      "https://example.com/callback"
    ],
    "scopes": [
      "openid",
      "profile",
      "email"
    ]
  }
]
```

### Fields

- **id**: The unique identifier of the OAuth2 client
- **redirectionUris**: Array of allowed redirect URIs for the client
- **scopes**: Array of OAuth2 scopes granted to the client

## Sync Schedule

The data is automatically synced every hour via GitHub Actions:

- **Staging**: `.github/workflows/fetch-oidc-staging.yml`
- **Production**: `.github/workflows/fetch-oidc-prod.yml`

You can also trigger a manual sync by running the workflow dispatch in GitHub Actions.

## Local Testing

To test the fetch script locally:

```bash
# Set environment variables
export ENVIRONMENT=staging  # or prod
export PING_TENANT_URL=your-tenant-url

# Run the script
./scripts/fetch-oidc-clients.sh
```

**Note**: You must have Frodo CLI installed and configured with appropriate credentials.

## File Location

These files are stored in `public/oidc-clients/` so they can be served by Next.js and accessed by the runbook page at runtime.

## Source

This data is fetched from the same Ping Identity tenants used in the [ping-identity-cloud-config](https://github.com/your-org/ping-identity-cloud-config) repository, but only extracts essential OAuth2 client information rather than the full configuration.
