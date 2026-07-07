import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RunbookData {
	clientId: string;
	environment: "staging" | "production";
	endpoints: {
		metadata: string;
		authorization: string;
		token: string;
		userInfo: string;
		revoke: string;
		endSession: string;
	};
	scopes?: string[];
	scopeSource?: "client_credentials" | "metadata";
	usePKCE: boolean;
	redirectUris?: string[];
}

export const generateRunbookPdf = async (
	runbook: RunbookData,
	codeChallenge: string,
): Promise<void> => {
	const pdf = new jsPDF({
		orientation: "portrait",
		unit: "mm",
		format: "a4",
	});

	let yPos = 20;
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const margin = 15;
	const maxWidth = pageWidth - 2 * margin;

	// Helper function to check and add new page if needed
	const checkPageBreak = (neededSpace: number = 20) => {
		if (yPos > pageHeight - neededSpace) {
			pdf.addPage();
			yPos = 20;
		}
	};

	// Helper function to add text with wrapping
	const addText = (
		text: string,
		fontSize: number,
		isBold: boolean = false,
		color: number[] = [0, 0, 0],
	) => {
		checkPageBreak();
		pdf.setFontSize(fontSize);
		pdf.setFont("helvetica", isBold ? "bold" : "normal");
		pdf.setTextColor(...color);
		const lines = pdf.splitTextToSize(text, maxWidth);
		pdf.text(lines, margin, yPos);
		yPos += lines.length * fontSize * 0.4;
	};

	// Helper function to add code block
	const addCodeBlock = (text: string, fontSize: number = 8) => {
		checkPageBreak(30);
		pdf.setFillColor(245, 245, 245);
		const lines = pdf.splitTextToSize(text, maxWidth - 4);
		const blockHeight = lines.length * fontSize * 0.4 + 4;
		pdf.rect(margin, yPos - 2, maxWidth, blockHeight, "F");
		pdf.setFontSize(fontSize);
		pdf.setFont("courier", "normal");
		pdf.setTextColor(0, 0, 0);
		pdf.text(lines, margin + 2, yPos + 2);
		yPos += blockHeight + 2;
	};

	// Title
	addText("Ping OIDC Configuration", 18, true, [123, 31, 162]);
	yPos += 8;

	// Header Info
	addText(`Client ID: ${runbook.clientId}`, 11, false);
	yPos += 1;
	addText(
		`Environment: ${runbook.environment.charAt(0).toUpperCase() + runbook.environment.slice(1)}`,
		11,
		false,
	);
	yPos += 8;

	// ===== OIDC ENDPOINTS =====
	addText("OIDC Endpoints", 14, true, [123, 31, 162]);
	yPos += 5;

	// 1. Metadata URL
	addText("Metadata URL", 12, true, [147, 51, 234]);
	yPos += 4;
	addCodeBlock(runbook.endpoints.metadata);
	yPos += 3;
	addText(
		"The OIDC discovery endpoint that returns server configuration including supported endpoints, scopes, grant types, and authentication methods. This is a publicly accessible endpoint that requires no authentication.",
		9,
	);
	yPos += 5;

	addText("Example Response", 10, true);
	yPos += 3;
	const metadataResponse = `{
  "issuer": "https://${runbook.environment === "staging" ? "staging-" : ""}api.nfl.com/accounts/v1/auth/oidc",
  "authorization_endpoint": "${runbook.endpoints.authorization}",
  "token_endpoint": "${runbook.endpoints.token}",
  "userinfo_endpoint": "${runbook.endpoints.userInfo}",
  "revocation_endpoint": "${runbook.endpoints.revoke}",
  "end_session_endpoint": "${runbook.endpoints.endSession}",
  "scopes_supported": ["openid", "profile", "email", "offline_access"],
  "response_types_supported": ["code", "token", "id_token"],
  "grant_types_supported": ["authorization_code", "refresh_token", "client_credentials"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"]
}`;
	addCodeBlock(metadataResponse, 7);
	yPos += 8;

	// 2. Authorization URL
	addText("Authorization URL", 12, true, [147, 51, 234]);
	yPos += 4;
	addCodeBlock(runbook.endpoints.authorization);
	yPos += 3;
	addText(
		"The starting point of the OAuth 2.0 authorization code flow. Users are redirected here to authenticate and authorize your application. Upon successful authentication, the authorization server redirects back to your redirect_uri with an authorization code.",
		9,
	);
	yPos += 5;

	// Parameters Table
	autoTable(pdf, {
		startY: yPos,
		head: [["Parameter", "Description", "Example"]],
		body: [
			["response_type", "Type of response requested", "code"],
			["client_id", "Your application's client identifier", runbook.clientId],
			[
				"redirect_uri",
				"Where to send the user after auth",
				"https://app.com/callback",
			],
			["scope", "Space-separated list of permissions", "openid+profile+email"],
			...(runbook.usePKCE
				? [
						[
							"code_challenge",
							"SHA256 hash of code verifier",
							codeChallenge.trim() || "E9Melhoa2OwvFr...",
						],
						["code_challenge_method", "Hashing algorithm used", "S256"],
					]
				: []),
		],
		margin: { left: margin, right: margin },
		styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
		headStyles: {
			fillColor: [147, 51, 234],
			textColor: 255,
			fontStyle: "bold",
		},
		theme: "grid",
		columnStyles: {
			0: { cellWidth: 40 },
			1: { cellWidth: 80 },
			2: { cellWidth: 50 },
		},
	});
	yPos = (pdf as any).lastAutoTable.finalY + 5;

	// Generated Authorization URLs (if redirect URIs exist)
	if (runbook.redirectUris && runbook.redirectUris.length > 0) {
		runbook.redirectUris.forEach((redirectUri, index) => {
			checkPageBreak(25);
			addText(`URL #${index + 1}: ${redirectUri}`, 9, false, [59, 130, 246]);
			yPos += 2;
			const scopeString =
				runbook.scopes && runbook.scopeSource === "client_credentials"
					? runbook.scopes.join("+")
					: "openid+address+phone+profile+email+nfl_complete";
			const challengeValue = codeChallenge.trim() || "{CODE_CHALLENGE}";
			const authUrl = `${runbook.endpoints.authorization}?response_type=code&client_id=${runbook.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopeString}${runbook.usePKCE ? `&code_challenge=${challengeValue}&code_challenge_method=S256` : ""}`;
			addCodeBlock(authUrl, 7);
			yPos += 3;
		});
	}

	// Example Request
	addText("Example Request", 10, true);
	yPos += 3;
	const scopeString =
		runbook.scopes && runbook.scopeSource === "client_credentials"
			? runbook.scopes.join("+")
			: "openid+address+phone+profile+email+nfl_complete";
	const challengeValue = codeChallenge.trim() || "{CODE_CHALLENGE}";
	const authExample = `${runbook.endpoints.authorization}?response_type=code&client_id=${runbook.clientId}&redirect_uri={REDIRECT_URI}&scope=${scopeString}${runbook.usePKCE ? `&code_challenge=${challengeValue}&code_challenge_method=S256` : ""}`;
	addCodeBlock(authExample, 7);
	yPos += 5;

	// Redirect Response
	addText("Redirect Response", 10, true);
	yPos += 3;
	addCodeBlock("{REDIRECT_URI}?code={AUTHORIZATION_CODE}");
	yPos += 2;
	addText(
		"After successful authentication, the user is redirected back to your application with an authorization code in the query parameters.",
		8,
	);
	yPos += 8;

	// 3. Token URL
	addText("Token URL", 12, true, [147, 51, 234]);
	yPos += 4;
	addCodeBlock(runbook.endpoints.token);
	yPos += 3;
	addText(
		`Exchange the authorization code for access tokens and ID tokens. This is a server-to-server call that should be made from your backend. ${runbook.usePKCE ? "With PKCE, the code_verifier proves that the same client that started the flow is completing it." : "Client authentication is done via Basic Auth header with client credentials."}`,
		9,
	);
	yPos += 5;

	// Token Parameters Table
	autoTable(pdf, {
		startY: yPos,
		head: [["Parameter", "Description", "Example"]],
		body: [
			[
				"grant_type",
				"OAuth grant type for token exchange",
				"authorization_code",
			],
			["code", "Authorization code from redirect", "abc123def456..."],
			[
				"redirect_uri",
				"Must match the original redirect URI",
				"https://app.com/callback",
			],
			...(runbook.usePKCE
				? [
						[
							"client_id",
							"Your application's client identifier",
							runbook.clientId,
						],
						[
							"code_verifier",
							"Original random string (before hashing)",
							"dBjftJeZ4CVP...",
						],
					]
				: [
						[
							"Authorization",
							"Basic Auth header (base64 encoded)",
							"Basic Y2xpZW50...",
						],
					]),
		],
		margin: { left: margin, right: margin },
		styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
		headStyles: {
			fillColor: [147, 51, 234],
			textColor: 255,
			fontStyle: "bold",
		},
		theme: "grid",
		columnStyles: {
			0: { cellWidth: 40 },
			1: { cellWidth: 80 },
			2: { cellWidth: 50 },
		},
	});
	yPos = (pdf as any).lastAutoTable.finalY + 5;

	// cURL Example
	addText("Example Request (cURL)", 10, true);
	yPos += 3;
	const curlExample = runbook.usePKCE
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
  -d "redirect_uri={REDIRECT_URI}"`;
	addCodeBlock(curlExample, 7);
	yPos += 5;

	// Success Response
	addText("Success Response", 10, true);
	yPos += 3;
	const tokenResponse = `{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200a1b2c3d4...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "scope": "openid profile email"
}`;
	addCodeBlock(tokenResponse, 7);
	yPos += 2;
	addText(
		"The response contains an access_token (for API calls), id_token (user identity), and optionally a refresh_token (to get new access tokens).",
		8,
	);
	yPos += 8;

	// 4. UserInfo URL
	addText("UserInfo URL", 12, true, [147, 51, 234]);
	yPos += 4;
	addCodeBlock(runbook.endpoints.userInfo);
	yPos += 3;
	addText(
		"Retrieve user profile information using a valid access token. Returns claims about the authenticated user based on the requested scopes.",
		9,
	);
	yPos += 5;

	// UserInfo Headers Table
	addText("Required Headers", 10, true);
	yPos += 3;
	autoTable(pdf, {
		startY: yPos,
		head: [["Header", "Description", "Example"]],
		body: [
			["Authorization", "Bearer token with access token", "Bearer eyJhbGc..."],
		],
		margin: { left: margin, right: margin },
		styles: { fontSize: 8, cellPadding: 2 },
		headStyles: {
			fillColor: [147, 51, 234],
			textColor: 255,
			fontStyle: "bold",
		},
		theme: "grid",
	});
	yPos = (pdf as any).lastAutoTable.finalY + 5;

	addText("Example Request", 10, true);
	yPos += 3;
	addCodeBlock(
		`GET ${runbook.endpoints.userInfo}\nAuthorization: Bearer {ACCESS_TOKEN}`,
	);
	yPos += 5;

	addText("Example Response", 10, true);
	yPos += 3;
	const userInfoResponse = `{
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
}`;
	addCodeBlock(userInfoResponse, 6);
	yPos += 2;
	addText(
		"Returns user profile claims based on the requested scopes. The exact fields depend on which scopes were granted (openid, profile, email, address, etc.).",
		8,
	);
	yPos += 8;

	// 5. Revoke URL
	addText("Revoke URL", 12, true, [147, 51, 234]);
	yPos += 4;
	addCodeBlock(runbook.endpoints.revoke);
	yPos += 3;
	addText(
		"Revokes an access token or refresh token, immediately invalidating it. Use this when a user logs out or when you need to invalidate tokens for security reasons. The token cannot be used after revocation.",
		9,
	);
	yPos += 5;

	// Revoke Parameters Table
	autoTable(pdf, {
		startY: yPos,
		head: [["Parameter", "Description", "Example"]],
		body: [
			["token", "Access or refresh token to revoke", "eyJhbGciOiJSUzI..."],
			[
				"token_type_hint",
				"Type of token (optional but recommended)",
				"access_token",
			],
			[
				"Authorization",
				"Basic Auth header with client credentials",
				"Basic Y2xpZW50...",
			],
		],
		margin: { left: margin, right: margin },
		styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
		headStyles: {
			fillColor: [147, 51, 234],
			textColor: 255,
			fontStyle: "bold",
		},
		theme: "grid",
		columnStyles: {
			0: { cellWidth: 40 },
			1: { cellWidth: 80 },
			2: { cellWidth: 50 },
		},
	});
	yPos = (pdf as any).lastAutoTable.finalY + 5;

	addText("Example Request", 10, true);
	yPos += 3;
	addCodeBlock(
		`POST ${runbook.endpoints.revoke}\nContent-Type: application/x-www-form-urlencoded\nAuthorization: Basic {base64(CLIENT_ID:CLIENT_SECRET)}\n\ntoken={ACCESS_TOKEN_OR_REFRESH_TOKEN}\n&token_type_hint=access_token`,
	);
	yPos += 8;

	// 6. End Session URL
	addText("End Session URL", 12, true, [147, 51, 234]);
	yPos += 4;
	addCodeBlock(runbook.endpoints.endSession);
	yPos += 3;
	addText(
		"Terminates the user's single sign-on (SSO) session with the identity provider. Redirect users here during logout to end their SSO session. After ending the session, users are redirected to the post_logout_redirect_uri.",
		9,
	);
	yPos += 5;

	// End Session Parameters Table
	addText("Query Parameters", 10, true);
	yPos += 3;
	autoTable(pdf, {
		startY: yPos,
		head: [["Parameter", "Description", "Required"]],
		body: [
			[
				"id_token_hint",
				"ID token from the authentication response",
				"Recommended",
			],
			[
				"post_logout_redirect_uri",
				"Where to redirect after logout (must be registered)",
				"Optional",
			],
		],
		margin: { left: margin, right: margin },
		styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
		headStyles: {
			fillColor: [147, 51, 234],
			textColor: 255,
			fontStyle: "bold",
		},
		theme: "grid",
		columnStyles: {
			0: { cellWidth: 55 },
			1: { cellWidth: 95 },
			2: { cellWidth: 30 },
		},
	});
	yPos = (pdf as any).lastAutoTable.finalY + 5;

	addText("Example Request", 10, true);
	yPos += 3;
	addCodeBlock(
		`GET ${runbook.endpoints.endSession}?\n  id_token_hint={ID_TOKEN}\n  &post_logout_redirect_uri={POST_LOGOUT_REDIRECT_URI}`,
	);
	yPos += 8;

	// OAuth Scopes Section
	if (runbook.scopes && runbook.scopes.length > 0) {
		checkPageBreak(30);
		addText("OAuth Scopes", 14, true, [123, 31, 162]);
		yPos += 5;

		addText(runbook.scopes.join(", "), 9);
		yPos += 5;
		addText(`Total Scopes: ${runbook.scopes.length}`, 9, true);
		yPos += 5;
	}

	// Download the PDF
	const fileName = `runbook-${runbook.clientId}-${runbook.environment}-${new Date().toISOString().split("T")[0]}.pdf`;
	pdf.save(fileName);
};
