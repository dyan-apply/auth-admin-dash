import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clientId,
      tenantUrl,
      accessToken,
      realm = 'alpha' // Default realm
    } = body

    if (!clientId || !tenantUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required parameters: clientId, tenantUrl, and accessToken' },
        { status: 400 }
      )
    }

    // Construct the OAuth2 client endpoint
    const endpoint = `${tenantUrl}/am/json/realms/root/realms/${realm}/realm-config/agents/OAuth2Client/${clientId}`

    const headers: HeadersInit = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Accept-API-Version': 'resource=1.0, protocol=2.1',
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
    })

    const responseText = await response.text()
    let responseData

    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      return NextResponse.json(
        { error: 'Failed to parse response', details: responseText },
        { status: 500 }
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: responseData.message || responseData.detail || 'Failed to fetch client configuration',
          details: responseData
        },
        { status: response.status }
      )
    }

    // Extract relevant information
    const clientData = {
      clientId: responseData._id || clientId,
      scopes: responseData.coreOAuth2ClientConfig?.scopes?.value || [],
      defaultScopes: responseData.coreOAuth2ClientConfig?.defaultScopes?.value || [],
      redirectionUris: responseData.coreOAuth2ClientConfig?.redirectionUris?.value || [],
      clientName: responseData.coreOAuth2ClientConfig?.clientName?.value?.[0] || clientId,
      clientType: responseData.coreOAuth2ClientConfig?.clientType?.value || 'Confidential',
      grantTypes: responseData.advancedOAuth2ClientConfig?.grantTypes?.value || [],
      responseTypes: responseData.advancedOAuth2ClientConfig?.responseTypes?.value || [],
      tokenEndpointAuthMethod: responseData.advancedOAuth2ClientConfig?.tokenEndpointAuthMethod?.value || 'client_secret_basic',
      fullResponse: responseData // Include full response for debugging
    }

    return NextResponse.json(clientData)
  } catch (error) {
    console.error('Client fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
