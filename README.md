# Auth Admin Dashboard

A comprehensive authentication testing and administration dashboard featuring **Ping AIC OIDC testing** and Gigya account management.

## 🚀 Primary Features

### Ping AIC OIDC Tester

A browser-based OIDC flow tester designed for **Ping AIC migration** and testing. Get access tokens quickly without complex setup.

### Ping Admin Panel

Comprehensive administration panel for Ping AIC with client credentials authentication, log retrieval, and custom IDM endpoint management.

![Ping AIC OIDC Tester Interface](./docs/ping-aic-tester.png)
<!-- Place the Ping AIC tester screenshot in docs/ping-aic-tester.png -->

### Key Features

- 🔐 **Complete OIDC Flow Support**
  - Authorization Code Flow with PKCE
  - Implicit Flow
  - Refresh Token support
- 🌐 **Browser-Based Token Exchange** - No backend proxy needed
- 💾 **Persistent Configuration** - Settings saved to localStorage
- 🔄 **Automatic Token Refresh** - Built-in refresh token handling
- ⏱️ **Live Token Expiry Timer** - Color-coded countdown
- 📋 **One-Click Token Copy** - Easy token extraction
- 🔍 **JWT Decoder** - View token claims instantly

### Quick Start - Ping AIC Testing

1. **Navigate to Ping AIC tab** (default tab)
2. **Enter your metadata URL**: 
   ```
   https://auth.pingone.com/[env-id]/as/.well-known/openid-configuration
   ```
3. **Click "Fetch"** to auto-discover endpoints
4. **Enter your Client ID**
5. **Click "Start Authorization Flow"** - Opens in new window
6. **Complete authentication** in the popup
7. **Copy the redirect URL** from the callback page
8. **Paste and click "Exchange for Token"**
9. **Get your access token!** Copy and use for API testing

### Ping AIC Configuration

| Field | Description | Example |
|-------|-------------|---------|
| Metadata URL | OIDC discovery endpoint | `https://auth.pingone.com/.../openid-configuration` |
| Client ID | Your application's client ID | `my-app-client` |
| Client Secret | Optional for confidential clients | `secret123` |
| Redirect URI | Callback URL (auto-set) | `http://localhost:3000/callback` |
| Scope | OAuth scopes | `openid profile email` |
| Flow Type | Authorization Code or Implicit | Authorization Code recommended |
| PKCE | Proof Key for Code Exchange | Enable for public clients |

### Token Management

- **Access Token Display**: Always visible with copy button
- **ID Token Display**: Decoded JWT payload view
- **Refresh Token**: Automatic storage and refresh capability
- **Expiry Timer**: Live countdown with color indicators
  - 🟢 Green: > 1 minute remaining
  - 🟡 Yellow: < 1 minute remaining
  - 🔴 Red: Expired

## 🔐 Ping Admin Panel

### Features

- **Client Credentials Authentication**
  - OAuth 2.0 client credentials flow
  - Secure token management (session storage)
  - Support for custom scopes (fr:idm:*, fr:am:*)
  - Metadata endpoint auto-discovery

- **Log Retrieval System**
  - Real-time log fetching with API key/secret authentication
  - Advanced filtering (level, time range, custom queries)
  - Client-side search and pagination
  - Table and JSON view modes
  - Export logs as JSON

- **Custom IDM Endpoints**
  - NFL User Profile management
  - Schema configuration retrieval
  - Field mapping support

### Finding API Keys & Secrets in Ping AIC Console

1. **Log into Ping AIC Console** at your tenant URL
2. Navigate to **Tenant Settings** → **API Credentials**
3. Click **"+ New Credential"** or use an existing credential
4. Select appropriate scopes:
   - `fr:idm:*` - IDM operations
   - `fr:am:*` - AM operations  
   - `fr:idc:analytics:*` - Log retrieval
5. **Copy the API Key and Secret** (⚠️ Secret is only shown once!)
6. Store credentials securely

### Log Sources

Available log sources in Ping AIC:
- `am-core` - AM Core logs
- `am-access` - Access audit logs
- `am-activity` - Activity audit logs
- `am-authentication` - Authentication audit logs
- `am-config` - Configuration audit logs
- `idm-core` - IDM Core logs
- `idm-access` - IDM Access logs
- `idm-activity` - IDM Activity logs
- `idm-authentication` - IDM Authentication logs
- `idm-config` - IDM Configuration logs
- `idm-sync` - IDM Synchronization logs

---

## 🔓 Secondary Feature: Gigya Account Management

Legacy support for Gigya account administration with RBA unlock functionality.

### Gigya Features
- Unlock user accounts via RBA system
- Secure server-to-server authentication
- Real-time response viewing
- Activity history tracking

### Gigya Setup

1. **Configure credentials in `.env`:**
   ```env
   GIGYA_API_KEY=your_api_key_here
   GIGYA_SECRET_KEY=your_secret_key_here
   GIGYA_DATA_CENTER=us1
   GIGYA_USER_KEY=your_user_key_here
   ```

2. **Switch to Gigya tab** in the UI

---

## Installation

```bash
# Install dependencies
yarn install

# Copy environment file
cp .env.example .env

# Add your credentials to .env

# Run development server
yarn dev

# Open http://localhost:3000
```

## 📊 OIDC Client Data Sync

This project includes an automated system to fetch and sync OAuth2/OIDC client configurations from Ping Identity environments.

### What's Synced

The system automatically fetches essential OAuth2 client data every hour:
- **Client ID** - The unique identifier for each OAuth2 client
- **Redirection URIs** - Allowed callback URLs for the client
- **Scopes** - OAuth2 scopes granted to the client

### Data Files

- `public/oidc-clients/oidc-clients-staging.json` - Staging environment clients
- `public/oidc-clients/oidc-clients-prod.json` - Production environment clients

### How It Works

Two GitHub Actions workflows run hourly:
1. **STAGING**: `.github/workflows/fetch-oidc-staging.yml`
2. **PROD**: `.github/workflows/fetch-oidc-prod.yml`

Each workflow:
- Connects to Ping Identity using Frodo CLI
- Exports all OAuth2 client configurations
- Extracts only the essential fields (id, redirectionUris, scopes)
- Compiles all clients into a single JSON file per environment
- Commits changes back to the repository if data has changed

### Manual Sync

You can trigger a manual sync via GitHub Actions workflow dispatch, or run locally:

```bash
# Set environment variables
export ENVIRONMENT=staging  # or prod
export PING_TENANT_URL=your-tenant-url

# Run the script
./scripts/fetch-oidc-clients.sh
```

See `public/oidc-clients/README.md` for more details.

---

## Tech Stack

- **Next.js 13.5** - React framework with API routes
- **TypeScript** - Type safety throughout
- **Tailwind CSS** - Dark theme UI
- **localStorage** - Persistent configuration
- **JWT Decode** - Token inspection
- **Frodo CLI** - Ping Identity automation (GitHub Actions)

## Project Structure

```
src/
├── pages/
│   ├── api/
│   │   ├── ping/
│   │   │   ├── metadata.ts      # OIDC discovery
│   │   │   └── token-exchange.ts # Token exchange
│   │   └── gigya/
│   │       └── unlock.ts        # Gigya RBA
│   ├── index.tsx                # Main dashboard
│   └── callback.tsx             # OAuth callback handler
├── components/
│   ├── PingAICTester.tsx       # Ping AIC OIDC tester
│   ├── UnlockForm.tsx          # Gigya unlock form
│   └── ResponseViewer.tsx      # JSON viewer
└── lib/
    └── gigya.ts                # Gigya client
```

## API Endpoints

### Ping AIC Endpoints

**POST /api/ping/metadata**
- Fetches OIDC metadata from discovery endpoint

**POST /api/ping/token-exchange**
- Exchanges authorization code for tokens
- Supports PKCE and client credentials

### Gigya Endpoints

**POST /api/gigya/unlock**
- Unlocks user account in RBA system

## Development

```bash
# Development
yarn dev

# Build
yarn build

# Production
yarn start

# Lint
yarn lint
```

## Security

- No credentials stored in frontend code
- Browser-based token handling for Ping AIC
- Server-side authentication for Gigya
- PKCE support for public clients
- Secure localStorage for configuration

## License

Private - Internal Use Only