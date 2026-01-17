/**
 * Decode MHTML files to extract HTML content
 * MHTML files use quoted-printable encoding and contain multiple MIME parts
 */
export function decodeMhtml(mhtmlContent: string): string {
	// Check if this is actually an MHTML file
	if (
		!mhtmlContent.includes("MIME-Version") &&
		!mhtmlContent.includes("Content-Type: multipart")
	) {
		// Not MHTML, return as-is (it's probably plain HTML)
		return mhtmlContent;
	}

	// Find the HTML content part
	// MHTML structure:
	// - Headers
	// - Boundary separator
	// - Content-Type: text/html
	// - Content-Transfer-Encoding: quoted-printable (usually)
	// - The actual HTML content

	const lines = mhtmlContent.split("\n");
	let inHtmlSection = false;
	let isQuotedPrintable = false;
	const htmlLines: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Check if we're entering an HTML section
		if (line?.includes("Content-Type: text/html")) {
			inHtmlSection = true;
			continue;
		}

		// Check encoding type
		if (
			inHtmlSection &&
			line?.includes("Content-Transfer-Encoding: quoted-printable")
		) {
			isQuotedPrintable = true;
			continue;
		}

		// Skip until we hit the actual content (after blank line following headers)
		if (inHtmlSection && line?.trim() === "") {
			// Start collecting HTML from next line
			for (let j = i + 1; j < lines.length; j++) {
				const contentLine = lines[j];

				// Stop if we hit another boundary
				if (contentLine?.startsWith("------")) {
					break;
				}

				if (contentLine !== undefined) {
					htmlLines.push(contentLine);
				}
			}
			break;
		}
	}

	let html = htmlLines.join("\n");

	// Decode quoted-printable if needed
	if (isQuotedPrintable) {
		html = decodeQuotedPrintable(html);
	}

	return html;
}

/**
 * Decode quoted-printable encoding
 * Replaces =XX with the corresponding character
 */
function decodeQuotedPrintable(text: string): string {
	// Replace soft line breaks (= at end of line)
	text = text.replace(/=\r?\n/g, "");

	// Replace =XX with actual characters
	text = text.replace(/=([0-9A-F]{2})/g, (_, hex) => {
		return String.fromCharCode(Number.parseInt(hex, 16));
	});

	return text;
}
