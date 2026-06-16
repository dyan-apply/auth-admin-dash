import { NextRequest, NextResponse } from 'next/server'

/**
 * Fetches OAuth scopes from the OIDC metadata endpoint (/.well-known/openid-configuration)
 * This endpoint is publicly accessible and returns all server-supported scopes.
 * No authentication required.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { environment } = body

    if (!environment) {
      return NextResponse.json(
        { error: 'Missing required parameter: environment' },
        { status: 400 }
      )
    }

    // Construct the OIDC metadata/discovery endpoint based on environment
    // Using the NFL OIDC metadata endpoint path
    const baseApiDomain = environment === 'staging' ? 'staging-api.nfl.com' : 'api.nfl.com'
    const discoveryEndpoint = `https://${baseApiDomain}/accounts/v1/auth/oidc/.well-known/openid-configuration`

    console.log('Fetching OIDC metadata from:', discoveryEndpoint)

    const response = await fetch(discoveryEndpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    const responseText = await response.text()
    let responseData

    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      return NextResponse.json(
        { error: 'Failed to parse discovery response', details: responseText },
        { status: 500 }
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch OIDC discovery document',
          details: responseData
        },
        { status: response.status }
      )
    }

    // Extract scopes_supported from the discovery document
    const scopes = responseData.scopes_supported || []
    const grantTypes = responseData.grant_types_supported || []
    const responseTypes = responseData.response_types_supported || []

    return NextResponse.json({
      scopes,
      grantTypes,
      responseTypes,
      issuer: responseData.issuer,
      note: 'These are server-wide supported scopes, not specific to your client'
    })
  } catch (error) {
    console.error('Discovery fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch discovery document', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
