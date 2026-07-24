#!/bin/bash
set -e

# Fetch OIDC Clients from GitHub Repository
# Fetches OAuth2 client configuration from nfl/ping-identity-cloud-config
# and extracts essential fields: client ID, redirectionUris, and scopes

echo "Starting OIDC client fetch from GitHub..."

# Get environment (default: staging)
ENVIRONMENT=${ENVIRONMENT:-staging}

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo "Error: ENVIRONMENT must be 'staging' or 'prod'"
    exit 1
fi

# Get the repository root directory (parent of scripts/)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Create temporary directory for cloning
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Output file in public directory
OUTPUT_FILE="${REPO_ROOT}/public/oidc-clients/oidc-clients-${ENVIRONMENT}.json"
mkdir -p "${REPO_ROOT}/public/oidc-clients"

# GitHub repository details
GITHUB_REPO="nfl/ping-identity-cloud-config"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
CONFIG_DIR="config-${ENVIRONMENT}"

echo "Environment: $ENVIRONMENT"
echo "Repository root: $REPO_ROOT"
echo "Config directory: $CONFIG_DIR"
echo "Output file: $OUTPUT_FILE"

# Clone the repository (using token if available for private repos)
echo "Cloning repository..."
cd "$TEMP_DIR"

if [ -n "$GITHUB_TOKEN" ]; then
    echo "Using GitHub token for authentication"
    if ! git clone --depth 1 "https://${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git" repo 2>&1; then
        echo "Error: Failed to clone repository with provided token"
        echo "Please ensure GITHUB_TOKEN has access to ${GITHUB_REPO}"
        exit 1
    fi
else
    echo "⚠️  WARNING: No GITHUB_TOKEN provided, attempting public clone..."
    if ! git clone --depth 1 "https://github.com/${GITHUB_REPO}.git" repo 2>&1; then
        echo ""
        echo "Error: Failed to clone repository. The repository may be private."
        echo "Please set GITHUB_TOKEN environment variable with a token that has access to ${GITHUB_REPO}"
        echo ""
        echo "To generate a token:"
        echo "1. Go to https://github.com/settings/tokens"
        echo "2. Create a Personal Access Token with 'repo' scope"
        echo "3. Set it as PING_CONFIG_GITHUB_TOKEN secret in repository settings"
        exit 1
    fi
fi

# Check if config directory exists
if [ ! -d "repo/${CONFIG_DIR}" ]; then
    echo "Error: Config directory 'repo/${CONFIG_DIR}' not found"
    exit 1
fi

# Find all oauth2.app.json files and extract relevant data
echo "Processing OAuth2 client files in ${CONFIG_DIR}/realm/root-alpha..."

# Initialize JSON array
echo "[" > "$OUTPUT_FILE"

FIRST=true
COUNT=0

# Find all OAuth2 client files recursively in the root-alpha realm only
find "repo/${CONFIG_DIR}/realm/root-alpha" -name "*.oauth2.app.json" | sort | while read -r file; do
    echo "Processing: $(basename "$file")"

    # Extract the client data using jq
    # Handle both single object and array of objects in the application field
    CLIENT_DATA=$(jq -c '
        .application |
        if type == "object" then
            to_entries[] | {
                id: .key,
                redirectionUris: .value.coreOAuth2ClientConfig.redirectionUris,
                scopes: .value.coreOAuth2ClientConfig.scopes
            }
        elif type == "array" then
            .[] | {
                id: ._id,
                redirectionUris: .coreOAuth2ClientConfig.redirectionUris,
                scopes: .coreOAuth2ClientConfig.scopes
            }
        else
            empty
        end
    ' "$file" 2>/dev/null || echo "")

    if [ -n "$CLIENT_DATA" ]; then
        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            echo "," >> "$OUTPUT_FILE"
        fi
        echo "$CLIENT_DATA" >> "$OUTPUT_FILE"
        COUNT=$((COUNT + 1))
    fi
done

# Close JSON array
echo "]" >> "$OUTPUT_FILE"

# Format the JSON nicely
if command -v jq &> /dev/null; then
    TMP_OUTPUT=$(mktemp)
    jq '.' "$OUTPUT_FILE" > "$TMP_OUTPUT" && mv "$TMP_OUTPUT" "$OUTPUT_FILE"
fi

# Count clients
CLIENT_COUNT=$(jq 'length' "$OUTPUT_FILE" 2>/dev/null || echo "0")

echo "✅ Export completed for $ENVIRONMENT!"
echo "📊 Extracted $CLIENT_COUNT OAuth2 clients"
echo "📁 Output: $OUTPUT_FILE"

# Show sample of extracted clients
if [ "$CLIENT_COUNT" -gt 0 ]; then
    echo ""
    echo "Sample of extracted clients:"
    jq -r '.[0:3] | .[] | "  - \(.id)"' "$OUTPUT_FILE" 2>/dev/null || true
fi
