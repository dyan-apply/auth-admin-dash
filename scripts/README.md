# Scripts

## OIDC Client Fetching

### fetch-oidc-clients-from-github.sh

Fetches OIDC client configurations from the `nfl/ping-identity-cloud-config` GitHub repository instead of directly from Ping Identity via Frodo CLI.

#### Usage

```bash
# Fetch staging clients
ENVIRONMENT=staging ./scripts/fetch-oidc-clients-from-github.sh

# Fetch production clients
ENVIRONMENT=prod ./scripts/fetch-oidc-clients-from-github.sh

# With GitHub token for private repo access
GITHUB_TOKEN=your_token ENVIRONMENT=staging ./scripts/fetch-oidc-clients-from-github.sh
```

#### How it works

1. Clones the `nfl/ping-identity-cloud-config` repository (shallow clone for speed)
2. Looks for `*.oauth2.app.json` files in either `config-staging/` or `config-prod/` directory
3. Extracts the following fields for each client:
   - `id` - The OAuth2 client ID
   - `redirectionUris` - Array of allowed redirect URIs
   - `scopes` - Array of OAuth2 scopes
4. Outputs a formatted JSON file to `public/oidc-clients/oidc-clients-{environment}.json`

#### Environment Variables

- `ENVIRONMENT` - Required. Either `staging` or `prod`
- `GITHUB_TOKEN` - Optional. GitHub personal access token for private repo access. If not provided, attempts to clone as public repo.

#### Output Format

```json
[
  {
    "id": "client-id-here",
    "redirectionUris": [
      "https://example.com/callback"
    ],
    "scopes": [
      "openid",
      "email",
      "profile"
    ]
  }
]
```

#### GitHub Actions Integration

The script is automatically run every hour by GitHub Actions workflows:
- `.github/workflows/fetch-oidc-staging.yml` - Fetches staging clients
- `.github/workflows/fetch-oidc-prod.yml` - Fetches production clients

Both workflows require the `PING_CONFIG_GITHUB_TOKEN` secret to be set in the repository settings.

### fetch-oidc-clients.sh (Legacy)

Legacy script that connects directly to Ping Identity using Frodo CLI. This is being replaced by `fetch-oidc-clients-from-github.sh` due to connection issues with Frodo.

This script is kept for reference but is no longer used in production workflows.
