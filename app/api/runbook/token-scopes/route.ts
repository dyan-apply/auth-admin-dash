import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { clientId, clientSecret, metadataEndpoint } = body;

		if (!clientId || !clientSecret || !metadataEndpoint) {
			return NextResponse.json(
				{
					error:
						"Missing required parameters: clientId, clientSecret, and metadataEndpoint",
				},
				{ status: 400 },
			);
		}

		// First, fetch the OIDC metadata to get the issuer
		console.log("Fetching OIDC metadata from:", metadataEndpoint);
		const metadataResponse = await fetch(metadataEndpoint);

		if (!metadataResponse.ok) {
			return NextResponse.json(
				{
					error: "Failed to fetch OIDC metadata",
					details: await metadataResponse.text(),
				},
				{ status: 500 },
			);
		}

		const metadata = await metadataResponse.json();
		const issuer = metadata.issuer;

		if (!issuer) {
			return NextResponse.json(
				{ error: "No issuer found in OIDC metadata" },
				{ status: 500 },
			);
		}

		// For Ping Identity, the client credentials endpoint is at {issuer}/access_token
		// The OIDC token endpoint is for authorization_code flow only
		const accessTokenEndpoint = `${issuer}/access_token`;

		console.log("Using OAuth2 access_token endpoint:", accessTokenEndpoint);

		// Perform client credentials token exchange
		const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString(
			"base64",
		);

		const params = new URLSearchParams({
			grant_type: "client_credentials",
			scope: "openid address profile email nfl_complete", // Requesting common scopes
		});

		console.log("Token exchange request:", {
			endpoint: accessTokenEndpoint,
			clientId,
			hasSecret: !!clientSecret,
			body: params.toString(),
		});

		const response = await fetch(accessTokenEndpoint, {
			method: "POST",
			headers: {
				Authorization: `Basic ${authHeader}`,
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			},
			body: params.toString(),
		});

		const responseText = await response.text();
		let responseData;

		try {
			responseData = JSON.parse(responseText);
		} catch (e) {
			return NextResponse.json(
				{ error: "Failed to parse token response", details: responseText },
				{ status: 500 },
			);
		}

		if (!response.ok) {
			console.error("Token exchange failed:", {
				status: response.status,
				statusText: response.statusText,
				body: responseData,
			});

			// Provide more detailed error message
			let errorMessage =
				responseData.error_description ||
				responseData.error ||
				"Failed to exchange token";

			if (
				responseData.error === "invalid_client" ||
				responseData.error === "unauthorized_client"
			) {
				errorMessage =
					"Invalid client credentials or client not authorized for client_credentials grant. Please verify your Client ID and Client Secret, and ensure the client is configured for Client Credentials grant in the Ping Dashboard.";
			}

			return NextResponse.json(
				{
					error: errorMessage,
					details: responseData,
					debug: {
						endpoint: accessTokenEndpoint,
						issuer: issuer,
						status: response.status,
						grantType: "client_credentials",
					},
				},
				{ status: response.status },
			);
		}

		// Extract scopes from the token response
		const scopes = responseData.scope ? responseData.scope.split(" ") : [];

		return NextResponse.json({
			scopes,
			tokenType: responseData.token_type,
			expiresIn: responseData.expires_in,
			rawScope: responseData.scope,
		});
	} catch (error) {
		console.error("Token exchange error:", error);
		return NextResponse.json(
			{
				error: "Failed to perform token exchange",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
