import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { BookOpen, AlertCircle, Download } from 'lucide-react'
import Header from '@/components/Header'
import CopyButton from '@/components/CopyButton'
import ParameterTable from '@/components/ParameterTable'
import { generateRunbookPdf } from '@/utils/generateRunbookPdf'

type Environment = 'staging' | 'production'

interface OidcClientData {
  id: string
  redirectionUris: string[]
  scopes: string[]
}

interface RunbookData {
  clientId: string
  environment: Environment
  endpoints: {
    metadata: string
    authorization: string
    token: string
    userInfo: string
    revoke: string
    endSession: string
  }
  scopes?: string[]
  scopeSource?: 'client_credentials' | 'metadata'
  usePKCE: boolean
  redirectUris?: string[]
}

export default function Runbook() {
  const [clientId, setClientId] = useState('')
  const [environment, setEnvironment] = useState<Environment>('staging')
  const [loading, setLoading] = useState(false)
  const [runbook, setRunbook] = useState<RunbookData | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usePKCE, setUsePKCE] = useState(false)
  const [codeChallenge, setCodeChallenge] = useState('')
  const [oidcClientsData, setOidcClientsData] = useState<Record<Environment, OidcClientData[]>>({
    staging: [],
    production: []
  })
  const [clientFound, setClientFound] = useState<boolean>(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const runbookContentRef = useRef<HTMLDivElement>(null)

  // Load OIDC client data on mount
  useEffect(() => {
    const loadOidcData = async () => {
      try {
        const [stagingRes, prodRes] = await Promise.all([
          fetch('/oidc-clients/oidc-clients-staging.json'),
          fetch('/oidc-clients/oidc-clients-prod.json')
        ])

        const stagingData = stagingRes.ok ? await stagingRes.json() : []
        const prodData = prodRes.ok ? await prodRes.json() : []

        setOidcClientsData({
          staging: stagingData,
          production: prodData
        })
      } catch (err) {
        console.warn('Failed to load OIDC client data:', err)
      }
    }

    loadOidcData()
  }, [])

  // Check if client exists when client ID or environment changes
  useEffect(() => {
    if (!clientId.trim()) {
      setClientFound(false)
      return
    }

    const clientData = oidcClientsData[environment].find(
      (client) => client.id.toLowerCase() === clientId.trim().toLowerCase()
    )

    setClientFound(!!clientData)
  }, [clientId, environment, oidcClientsData])

  const handleGenerateRunbook = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Generate runbook based on environment
      const baseIdDomain = environment === 'staging' ? 'staging-id.nfl.com' : 'id.nfl.com'
      const baseApiDomain = environment === 'staging' ? 'staging-api.nfl.com' : 'api.nfl.com'

      const generatedRunbook: RunbookData = {
        clientId,
        environment,
        usePKCE,
        endpoints: {
          metadata: `https://${baseApiDomain}/accounts/v1/auth/oidc/.well-known/openid-configuration`,
          authorization: `https://${baseIdDomain}/oidc/op/v1.0/alpha/authorize`,
          token: `https://${baseApiDomain}/accounts/v1/auth/oidc/token`,
          userInfo: `https://${baseApiDomain}/accounts/v1/auth/oidc/userinfo`,
          revoke: `https://${baseApiDomain}/accounts/v1/auth/oidc/revoke`,
          endSession: `https://${baseApiDomain}/accounts/v1/auth/oidc/end_session`
        }
      }

      // Check if we have client data from our OIDC clients JSON
      const clientData = oidcClientsData[environment].find(
        (client) => client.id.toLowerCase() === clientId.trim().toLowerCase()
      )

      // Fetch scopes - prioritize: 1) client data, 2) client credentials, 3) OIDC metadata
      let scopesFetched = false
      let scopeSource: 'client_credentials' | 'metadata' = 'metadata'

      // Use scopes and redirect URIs from our OIDC client data if available
      if (clientData) {
        if (clientData.scopes && clientData.scopes.length > 0) {
          generatedRunbook.scopes = clientData.scopes
          scopesFetched = true
          scopeSource = 'client_credentials' // Treat as client-specific scopes
        }

        if (clientData.redirectionUris && clientData.redirectionUris.length > 0) {
          generatedRunbook.redirectUris = clientData.redirectionUris
        }
      }

      // Fallback to OIDC metadata endpoint if we don't have scopes
      if (!scopesFetched) {
        try {
          const response = await fetch('/api/runbook/discovery-scopes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              environment
            })
          })

          if (response.ok) {
            const discoveryData = await response.json()
            generatedRunbook.scopes = discoveryData.scopes
            scopesFetched = true
            scopeSource = 'metadata'
          } else {
            const errorData = await response.json()
            console.warn('Metadata fetch failed:', errorData)
            setError('Unable to fetch scopes from OIDC metadata endpoint.')
          }
        } catch (err) {
          console.warn('Error fetching scopes from metadata:', err)
        }
      }

      // Store the source for display purposes
      (generatedRunbook as any).scopeSource = scopeSource

      setRunbook(generatedRunbook)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate runbook')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownloadPdf = async () => {
    if (!runbook) return

    setIsGeneratingPdf(true)

    try {
      await generateRunbookPdf(runbook, codeChallenge)
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      setError('Failed to generate PDF. Please try again.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <>
      <Head>
        <title>Runbook Generator - Auth Admin Dashboard</title>
        <meta name="description" content="Generate runbooks for client configurations" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-900">
        <Header activeTab="runbook" />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-medium text-gray-100">Generate Runbook</h2>
              </div>

              <form onSubmit={handleGenerateRunbook} className="space-y-6">
                {/* Client ID Input */}
                <div>
                  <label htmlFor="clientId" className="block text-sm font-medium text-gray-300 mb-2">
                    Client ID *
                  </label>
                  <input
                    type="text"
                    id="clientId"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter client ID (e.g., CTV-PROD)"
                    required
                  />
                  {clientId.trim() && (
                    <p className={`text-xs mt-1 ${clientFound ? 'text-green-400' : 'text-yellow-400'}`}>
                      {clientFound
                        ? '✓ Client found - redirect URIs and scopes will be auto-populated'
                        : '⚠ Client not found in database - will use fallback metadata scopes'}
                    </p>
                  )}
                </div>

                {/* Environment Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Environment *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="environment"
                        value="staging"
                        checked={environment === 'staging'}
                        onChange={(e) => setEnvironment(e.target.value as Environment)}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm text-gray-300">Staging</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="environment"
                        value="production"
                        checked={environment === 'production'}
                        onChange={(e) => setEnvironment(e.target.value as Environment)}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm text-gray-300">Production</span>
                    </label>
                  </div>
                </div>

                {/* PKCE Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Authorization Flow *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="pkce"
                        checked={!usePKCE}
                        onChange={() => {
                          setUsePKCE(false)
                          setCodeChallenge('')
                        }}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm text-gray-300">Without PKCE</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="pkce"
                        checked={usePKCE}
                        onChange={() => setUsePKCE(true)}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm text-gray-300">Using PKCE</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    PKCE (Proof Key for Code Exchange) adds code_challenge and code_challenge_method parameters
                  </p>
                </div>

                {/* Code Challenge Input - Only shown when PKCE is selected */}
                {usePKCE && (
                  <div>
                    <label htmlFor="codeChallenge" className="block text-sm font-medium text-gray-300 mb-2">
                      Code Challenge (Optional)
                    </label>
                    <input
                      type="text"
                      id="codeChallenge"
                      value={codeChallenge}
                      onChange={(e) => setCodeChallenge(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                      placeholder="E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      If provided, this value will be used in the generated examples. Otherwise, {'{CODE_CHALLENGE}'} placeholder will be shown.
                    </p>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  type="submit"
                  disabled={loading || !clientId.trim()}
                  className="w-full px-6 py-3 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    'Generate Runbook'
                  )}
                </button>
              </form>

              {/* Info Card */}
              {!runbook && (
                <div className="mt-6 bg-purple-900/20 rounded-lg border border-purple-800 p-4">
                  <h3 className="text-sm font-medium text-purple-300 mb-2">About Runbook Generation</h3>
                  <p className="text-xs text-purple-200 mb-3">
                    Generate a comprehensive runbook containing OIDC endpoints, client-specific scopes, redirect URIs, and authorization URLs.
                  </p>
                  <div className="text-xs text-purple-200 space-y-2">
                    <div>
                      <strong className="text-purple-300">Auto-Population:</strong>
                      <div className="ml-3 mt-1">When you enter a Client ID, we automatically look it up in our OIDC client database (synced hourly from Ping Identity) and populate redirect URIs and scopes if found</div>
                    </div>
                    <div>
                      <strong className="text-purple-300">Fallback:</strong>
                      <div className="ml-3 mt-1">If the client is not found in our database, we'll use server-supported scopes from the OIDC metadata endpoint (<code className="bg-purple-950/50 px-1 rounded">/.well-known/openid-configuration</code>)</div>
                    </div>
                    <div>
                      <strong className="text-purple-300">Authorization URLs:</strong>
                      <div className="ml-3 mt-1">For clients with redirect URIs, we auto-generate complete authorization URLs for each URI, making it easy to test different callback endpoints</div>
                    </div>
                    <div>
                      <strong className="text-purple-300">Data Source:</strong>
                      <div className="ml-3 mt-1">Client data is automatically synced from Ping Identity staging and production environments every hour</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Generated Runbook */}
            {runbook && (
              <div className="mt-6 space-y-6 animate-fade-in">
                {/* Download PDF Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download as PDF
                      </>
                    )}
                  </button>
                </div>

                {/* Runbook Content */}
                <div ref={runbookContentRef}>
                {/* Header Card */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-xl font-semibold text-gray-100 mb-4">Ping OIDC Configuration</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Client ID:</span>
                      <span className="ml-2 text-gray-100 font-mono">{runbook.clientId}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Environment:</span>
                      <span className="ml-2 text-gray-100 capitalize">{runbook.environment}</span>
                    </div>
                  </div>
                </div>

                {/* Endpoints Card */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-4">OIDC Endpoints</h3>
                  <div className="space-y-6">
                    {/* Metadata Endpoint */}
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-purple-400">Metadata URL</h4>
                        <CopyButton
                          text={runbook.endpoints.metadata}
                          fieldId="metadata"
                          copiedField={copiedField}
                          onCopy={copyToClipboard}
                        />
                      </div>
                      <code className="text-xs text-gray-300 break-all block mb-3">{runbook.endpoints.metadata}</code>

                      <p className="text-xs text-gray-400 mb-3">
                        The OIDC discovery endpoint that returns server configuration including supported endpoints, scopes, grant types, and authentication methods. This is a publicly accessible endpoint that requires no authentication.
                      </p>

                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-400">Example Response</span>
                          <CopyButton
                            text={`{
  "issuer": "https://${runbook.environment === 'staging' ? 'staging-' : ''}api.nfl.com/accounts/v1/auth/oidc",
  "authorization_endpoint": "${runbook.endpoints.authorization}",
  "token_endpoint": "${runbook.endpoints.token}",
  "userinfo_endpoint": "${runbook.endpoints.userInfo}",
  "revocation_endpoint": "${runbook.endpoints.revoke}",
  "end_session_endpoint": "${runbook.endpoints.endSession}",
  "scopes_supported": ["openid", "profile", "email", "offline_access"],
  "response_types_supported": ["code", "token", "id_token"],
  "grant_types_supported": ["authorization_code", "refresh_token", "client_credentials"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"]
}`}
                            fieldId="metadata-response"
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            size="sm"
                          />
                        </div>
                        <pre className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded overflow-x-auto">
{`{
  "issuer": "https://${runbook.environment === 'staging' ? 'staging-' : ''}api.nfl.com/accounts/v1/auth/oidc",
  "authorization_endpoint": "${runbook.endpoints.authorization}",
  "token_endpoint": "${runbook.endpoints.token}",
  "userinfo_endpoint": "${runbook.endpoints.userInfo}",
  "revocation_endpoint": "${runbook.endpoints.revoke}",
  "end_session_endpoint": "${runbook.endpoints.endSession}",
  "scopes_supported": ["openid", "profile", "email", "offline_access"],
  "response_types_supported": ["code", "token", "id_token"],
  "grant_types_supported": ["authorization_code", "refresh_token", "client_credentials"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"]
}`}
                        </pre>
                      </div>
                    </div>

                    {/* Authorization Endpoint */}
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-purple-400">Authorization URL</h4>
                        <CopyButton
                          text={runbook.endpoints.authorization}
                          fieldId="authorization"
                          copiedField={copiedField}
                          onCopy={copyToClipboard}
                        />
                      </div>
                      <code className="text-xs text-gray-300 break-all block mb-3">{runbook.endpoints.authorization}</code>

                      <p className="text-xs text-gray-400 mb-3">
                        The starting point of the OAuth 2.0 authorization code flow. Users are redirected here to authenticate and authorize your application. Upon successful authentication, the authorization server redirects back to your redirect_uri with an authorization code.
                      </p>

                      {/* Parameters Table */}
                      <ParameterTable
                        columns={['Parameter', 'Description', 'Example']}
                        rows={[
                          { parameter: 'response_type', description: 'Type of response requested', example: 'code' },
                          { parameter: 'client_id', description: 'Your application\'s client identifier', example: runbook.clientId },
                          { parameter: 'redirect_uri', description: 'Where to send the user after auth', example: 'https://app.com/callback' },
                          { parameter: 'scope', description: 'Space-separated list of permissions', example: 'openid+profile+email' },
                          ...(runbook.usePKCE ? [
                            { parameter: 'code_challenge', description: 'SHA256 hash of code verifier', example: 'E9Melhoa2OwvFr...' },
                            { parameter: 'code_challenge_method', description: 'Hashing algorithm used', example: 'S256' }
                          ] : [])
                        ]}
                      />

                      {/* Show generated authorization URLs if redirect URIs were provided */}
                      {runbook.redirectUris && runbook.redirectUris.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-600 space-y-3">
                          <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
                            <p className="text-xs text-green-300">
                              ✓ Generated {runbook.redirectUris.length} authorization URL{runbook.redirectUris.length > 1 ? 's' : ''} for your redirect URIs
                            </p>
                          </div>

                          {runbook.redirectUris.map((redirectUri, index) => {
                            const scopeString = runbook.scopes && runbook.scopeSource === 'client_credentials'
                              ? runbook.scopes.join('+')
                              : 'openid+address+phone+profile+email+nfl_complete'
                            const challengeValue = codeChallenge.trim() || '{CODE_CHALLENGE}'
                            const authUrl = `${runbook.endpoints.authorization}?response_type=code&client_id=${runbook.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopeString}${runbook.usePKCE ? `&code_challenge=${challengeValue}&code_challenge_method=S256` : ''}`

                            return (
                              <div key={index} className="bg-gray-800/50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-gray-300">
                                    URL #{index + 1}: <span className="text-blue-400 font-mono text-[10px]">{redirectUri}</span>
                                  </span>
                                  <CopyButton
                                    text={authUrl}
                                    fieldId={`auth-url-${index}`}
                                    copiedField={copiedField}
                                    onCopy={copyToClipboard}
                                    size="sm"
                                  />
                                </div>
                                <pre className="text-[10px] text-gray-400 bg-gray-900/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
                                  {authUrl}
                                </pre>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Always show example request */}
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-400">Example Request</span>
                          <CopyButton
                            text={(() => {
                              const scopeString = runbook.scopes && runbook.scopeSource === 'client_credentials'
                                ? runbook.scopes.join('+')
                                : 'openid+address+phone+profile+email+nfl_complete'
                              const challengeValue = codeChallenge.trim() || '{CODE_CHALLENGE}'
                              const baseParams = `${runbook.endpoints.authorization}?response_type=code&client_id=${runbook.clientId}&redirect_uri={REDIRECT_URI}&scope=${scopeString}`
                              const pkceParams = runbook.usePKCE ? `&code_challenge=${challengeValue}&code_challenge_method=S256` : ''
                              return baseParams + pkceParams
                            })()}
                            fieldId="authorization-example"
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            size="sm"
                          />
                        </div>
                        <pre className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
{`${runbook.endpoints.authorization}?response_type=code&client_id=${runbook.clientId}&redirect_uri={REDIRECT_URI}&scope=${runbook.scopes && runbook.scopeSource === 'client_credentials' ? runbook.scopes.join('+') : 'openid+address+phone+profile+email+nfl_complete'}${runbook.usePKCE ? `&code_challenge=${codeChallenge.trim() || '{CODE_CHALLENGE}'}&code_challenge_method=S256` : ''}`}
                        </pre>
                      </div>

                      {/* Always show redirect response example */}
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-400">Redirect Response</span>
                          <CopyButton
                            text="{REDIRECT_URI}?code={AUTHORIZATION_CODE}"
                            fieldId="authorization-response"
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            size="sm"
                          />
                        </div>
                        <pre className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
{`{REDIRECT_URI}?code={AUTHORIZATION_CODE}`}
                        </pre>
                        <p className="text-xs text-gray-500 mt-2">
                          After successful authentication, the user is redirected back to your application with an authorization code in the query parameters.
                        </p>
                      </div>
                    </div>

                    {/* Token Endpoint */}
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-purple-400">Token URL</h4>
                        <CopyButton
                          text={runbook.endpoints.token}
                          fieldId="token"
                          copiedField={copiedField}
                          onCopy={copyToClipboard}
                        />
                      </div>
                      <code className="text-xs text-gray-300 break-all block mb-3">{runbook.endpoints.token}</code>

                      <p className="text-xs text-gray-400 mb-3">
                        Exchange the authorization code for access tokens and ID tokens. This is a server-to-server call that should be made from your backend. {runbook.usePKCE ? 'With PKCE, the code_verifier proves that the same client that started the flow is completing it.' : 'Client authentication is done via Basic Auth header with client credentials.'}
                      </p>

                      {/* Parameters Table */}
                      <ParameterTable
                        columns={['Parameter', 'Description', 'Example']}
                        rows={[
                          { parameter: 'grant_type', description: 'OAuth grant type for token exchange', example: 'authorization_code' },
                          { parameter: 'code', description: 'Authorization code from redirect', example: 'abc123def456...' },
                          { parameter: 'redirect_uri', description: 'Must match the original redirect URI', example: 'https://app.com/callback' },
                          ...(runbook.usePKCE ? [
                            { parameter: 'client_id', description: 'Your application\'s client identifier', example: runbook.clientId },
                            { parameter: 'code_verifier', description: 'Original random string (before hashing)', example: 'dBjftJeZ4CVP...' }
                          ] : [
                            { parameter: 'Authorization', description: 'Basic Auth header (base64 encoded)', example: 'Basic Y2xpZW50...' }
                          ])
                        ]}
                      />

                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-400">Example Request (cURL)</span>
                          <CopyButton
                            text={runbook.usePKCE
                              ? `curl -X POST "${runbook.endpoints.token}" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=authorization_code" \\
  -d "code={AUTHORIZATION_CODE}" \\
  -d "redirect_uri={REDIRECT_URI}" \\
  -d "client_id=${runbook.clientId}" \\
  -d "code_verifier={CODE_VERIFIER}"`
                              : `curl -X POST "${runbook.endpoints.token}" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -H "Authorization: Basic {base64(CLIENT_ID:CLIENT_SECRET)}" \\
  -d "grant_type=authorization_code" \\
  -d "code={AUTHORIZATION_CODE}" \\
  -d "redirect_uri={REDIRECT_URI}"`
                            }
                            fieldId="token-example"
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            size="sm"
                          />
                        </div>
                        <pre className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded overflow-x-auto">
{runbook.usePKCE ? `curl -X POST "${runbook.endpoints.token}" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=authorization_code" \\
  -d "code={AUTHORIZATION_CODE}" \\
  -d "redirect_uri={REDIRECT_URI}" \\
  -d "client_id=${runbook.clientId}" \\
  -d "code_verifier={CODE_VERIFIER}"` : `curl -X POST "${runbook.endpoints.token}" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -H "Authorization: Basic {base64(CLIENT_ID:CLIENT_SECRET)}" \\
  -d "grant_type=authorization_code" \\
  -d "code={AUTHORIZATION_CODE}" \\
  -d "redirect_uri={REDIRECT_URI}"`}
                        </pre>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-400">Success Response</span>
                          <CopyButton
                            text={`{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200a1b2c3d4...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "scope": "openid profile email"
}`}
                            fieldId="token-response"
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            size="sm"
                          />
                        </div>
                        <pre className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded overflow-x-auto">
{`{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200a1b2c3d4...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "scope": "openid profile email"
}`}
                        </pre>
                        <p className="text-xs text-gray-500 mt-2">
                          The response contains an access_token (for API calls), id_token (user identity), and optionally a refresh_token (to get new access tokens).
                        </p>
                      </div>
                    </div>

                    {/* UserInfo Endpoint */}
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-purple-400">UserInfo URL</h4>
                        <CopyButton
                          text={runbook.endpoints.userInfo}
                          fieldId="userInfo"
                          copiedField={copiedField}
                          onCopy={copyToClipboard}
                        />
                      </div>
                      <code className="text-xs text-gray-300 break-all block mb-3">{runbook.endpoints.userInfo}</code>

                      <p className="text-xs text-gray-400 mb-3">
                        Retrieve user profile information using a valid access token. Returns claims about the authenticated user based on the requested scopes.
                      </p>

                      {/* Parameters Table */}
                      <ParameterTable
                        title="Required Headers"
                        columns={['Header', 'Description', 'Example']}
                        rows={[
                          { parameter: 'Authorization', description: 'Bearer token with access token', example: 'Bearer eyJhbGc...' }
                        ]}
                      />

                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-400">Example Request</span>
                          <CopyButton
                            text={`GET ${runbook.endpoints.userInfo}
Authorization: Bearer {ACCESS_TOKEN}`}
                            fieldId="userInfo-example"
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            size="sm"
                          />
                        </div>
                        <pre className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded overflow-x-auto">
{`GET ${runbook.endpoints.userInfo}
Authorization: Bearer {ACCESS_TOKEN}`}
                        </pre>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-400">Example Response</span>
                          <CopyButton
                            text={`{
  "sub": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "subname": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  "name": "John Smith",
  "given_name": "John",
  "family_name": "Smith",
  "email": "john.smith@example.com",
  "birthdate": "1990-05-15",
  "gender_identity": "man",
  "military_status": "false",
  "address": {
    "formatted": "456 Oak Avenue, Suite 200"
  },
  "city": "Chicago",
  "country": "US",
  "address_line2": "Suite 200",
  "account_status": "Active",
  "reg_source": "nfl mobile app",
  "show_scores": true,
  "display_preferences": {
    "hide_odds": false,
    "show_scores": true
  }
}`}
                            fieldId="userInfo-response"
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            size="sm"
                          />
                        </div>
                        <pre className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded overflow-x-auto">
{`{
  "sub": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "subname": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  "name": "John Smith",
  "given_name": "John",
  "family_name": "Smith",
  "email": "john.smith@example.com",
  "birthdate": "1990-05-15",
  "gender_identity": "man",
  "military_status": "false",
  "address": {
    "formatted": "456 Oak Avenue, Suite 200"
  },
  "city": "Chicago",
  "country": "US",
  "address_line2": "Suite 200",
  "account_status": "Active",
  "reg_source": "nfl mobile app",
  "show_scores": true,
  "display_preferences": {
    "hide_odds": false,
    "show_scores": true
  }
}`}
                        </pre>
                        <p className="text-xs text-gray-500 mt-2">
                          Returns user profile claims based on the requested scopes. The exact fields depend on which scopes were granted (openid, profile, email, address, etc.).
                        </p>
                      </div>
                    </div>

                    {/* Revoke Endpoint */}
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-purple-400">Revoke URL</h4>
                        <CopyButton
                          text={runbook.endpoints.revoke}
                          fieldId="revoke"
                          copiedField={copiedField}
                          onCopy={copyToClipboard}
                        />
                      </div>
                      <code className="text-xs text-gray-300 break-all block mb-3">{runbook.endpoints.revoke}</code>

                      <p className="text-xs text-gray-400 mb-3">
                        Revokes an access token or refresh token, immediately invalidating it. Use this when a user logs out or when you need to invalidate tokens for security reasons. The token cannot be used after revocation.
                      </p>

                      {/* Parameters Table */}
                      <ParameterTable
                        columns={['Parameter', 'Description', 'Example']}
                        columnWidths="grid-cols-[140px_1fr_140px]"
                        rows={[
                          { parameter: 'token', description: 'Access or refresh token to revoke', example: 'eyJhbGciOiJSUzI...' },
                          { parameter: 'token_type_hint', description: 'Type of token (optional but recommended)', example: 'access_token' },
                          { parameter: 'Authorization', description: 'Basic Auth header with client credentials', example: 'Basic Y2xpZW50...' }
                        ]}
                      />

                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-400">Example Request</span>
                          <CopyButton
                            text={`POST ${runbook.endpoints.revoke}
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64(CLIENT_ID:CLIENT_SECRET)}

token={ACCESS_TOKEN_OR_REFRESH_TOKEN}
&token_type_hint=access_token`}
                            fieldId="revoke-example"
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            size="sm"
                          />
                        </div>
                        <pre className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded overflow-x-auto">
{`POST ${runbook.endpoints.revoke}
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64(CLIENT_ID:CLIENT_SECRET)}

token={ACCESS_TOKEN_OR_REFRESH_TOKEN}
&token_type_hint=access_token`}
                        </pre>
                      </div>
                    </div>

                    {/* End Session Endpoint */}
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-purple-400">End Session URL</h4>
                        <CopyButton
                          text={runbook.endpoints.endSession}
                          fieldId="endSession"
                          copiedField={copiedField}
                          onCopy={copyToClipboard}
                        />
                      </div>
                      <code className="text-xs text-gray-300 break-all block mb-3">{runbook.endpoints.endSession}</code>

                      <p className="text-xs text-gray-400 mb-3">
                        Terminates the user's single sign-on (SSO) session with the identity provider. Redirect users here during logout to end their SSO session. After ending the session, users are redirected to the post_logout_redirect_uri.
                      </p>

                      {/* Parameters Table */}
                      <ParameterTable
                        title="Query Parameters"
                        columns={['Parameter', 'Description', 'Required']}
                        columnWidths="grid-cols-[180px_1fr_120px]"
                        rows={[
                          { parameter: 'id_token_hint', description: 'ID token from the authentication response', required: 'Recommended' },
                          { parameter: 'post_logout_redirect_uri', description: 'Where to redirect after logout (must be registered)', required: 'Optional' }
                        ]}
                      />

                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-400">Example Request</span>
                          <CopyButton
                            text={`GET ${runbook.endpoints.endSession}?
  id_token_hint={ID_TOKEN}
  &post_logout_redirect_uri={POST_LOGOUT_REDIRECT_URI}`}
                            fieldId="endSession-example"
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            size="sm"
                          />
                        </div>
                        <pre className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded overflow-x-auto">
{`GET ${runbook.endpoints.endSession}?
  id_token_hint={ID_TOKEN}
  &post_logout_redirect_uri={POST_LOGOUT_REDIRECT_URI}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* OAuth Scopes Card - Only show if scopes were fetched */}
                {runbook.scopes && runbook.scopes.length > 0 && (
                  <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-100 mb-4">OAuth Scopes</h3>

                    {runbook.scopeSource === 'client_credentials' ? (
                      <p className="text-sm text-gray-400 mb-4">
                        ✓ These are the scopes granted to this specific client
                        {oidcClientsData[environment].find((c) => c.id.toLowerCase() === clientId.trim().toLowerCase())
                          ? ' (from OIDC client database)'
                          : ' (retrieved via client credentials token exchange)'}
                        .
                      </p>
                    ) : (
                      <div className="mb-4 bg-blue-900/20 border border-blue-800 rounded-lg p-3">
                        <p className="text-sm text-blue-300">
                          ℹ️ These are all scopes supported by the server (from <code className="text-blue-200 bg-blue-950/50 px-1 rounded">/.well-known/openid-configuration</code>). Client not found in our database.
                        </p>
                      </div>
                    )}

                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex flex-wrap gap-2">
                        {runbook.scopes.map((scope, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-purple-900/50 text-purple-300 rounded-full text-sm font-mono border border-purple-800/50"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                      <div>
                        <strong>Total Scopes:</strong> {runbook.scopes.length}
                      </div>
                      <div>
                        <strong>Source:</strong> {runbook.scopeSource === 'client_credentials' ? 'Client Credentials' : 'OIDC Metadata'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="bg-red-900/20 rounded-lg border border-red-800 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-300">{error}</div>
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
