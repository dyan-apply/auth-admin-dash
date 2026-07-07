#!/bin/bash
set -e

# Fetch OIDC Clients Script
# Fetches OAuth2 client configuration from Ping Identity using Frodo CLI
# and extracts essential fields: client ID, redirectionUris, and scopes

echo "Starting OIDC client fetch..."

# Check required environment variables
if [ -z "$PING_TENANT_URL" ]; then
    echo "Error: PING_TENANT_URL is required"
    exit 1
fi

# Get environment (default: staging)
ENVIRONMENT=${ENVIRONMENT:-staging}

# Get the repository root directory (parent of scripts/)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Create temporary output directory for full export
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Output file in public directory
OUTPUT_FILE="${REPO_ROOT}/public/oidc-clients/oidc-clients-${ENVIRONMENT}.json"
mkdir -p "${REPO_ROOT}/public/oidc-clients"

echo "Environment: $ENVIRONMENT"
echo "Repository root: $REPO_ROOT"
echo "Tenant: $PING_TENANT_URL"
echo "Output file: $OUTPUT_FILE"

# Change to repo root before running frodo
cd "$REPO_ROOT"

# Run Frodo export to temporary directory
echo "Exporting OAuth2 clients from Ping..."
if ! frodo config export -A -N -D "$TEMP_DIR" "$PING_TENANT_URL"; then
  echo "⚠️  WARNING: Frodo export finished with errors for $ENVIRONMENT"
  echo "⚠️  Attempting to continue with partial results..."
fi

# Find all oauth2.app.json files and extract relevant data
echo "Processing OAuth2 client files..."

# Initialize JSON array
echo "[" > "$OUTPUT_FILE"

FIRST=true

# Find all OAuth2 client files recursively
find "$TEMP_DIR" -name "*.oauth2.app.json" | while read -r file; do
    # Extract the client data using jq
    CLIENT_DATA=$(jq -c '
        .application | to_entries[] | {
            id: .key,
            redirectionUris: .value.coreOAuth2ClientConfig.redirectionUris,
            scopes: .value.coreOAuth2ClientConfig.scopes
        }
    ' "$file" 2>/dev/null || echo "")

    if [ -n "$CLIENT_DATA" ]; then
        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            echo "," >> "$OUTPUT_FILE"
        fi
        echo "$CLIENT_DATA" >> "$OUTPUT_FILE"
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
