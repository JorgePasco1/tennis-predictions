/**
 * MHTML Decoder Unit Tests
 *
 * Tests for decoding MHTML files to extract HTML content.
 */

import { describe, expect, it } from "vitest";
import { decodeMhtml } from "./mhtmlDecoder";

describe("decodeMhtml", () => {
	describe("MHTML detection", () => {
		it("should pass through plain HTML without modification", () => {
			const plainHtml = `
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>Content</body>
</html>
      `.trim();

			const result = decodeMhtml(plainHtml);

			expect(result).toBe(plainHtml);
		});

		it("should detect MHTML by MIME-Version header", () => {
			const mhtml = `MIME-Version: 1.0
Content-Type: text/html

<html></html>`;

			const result = decodeMhtml(mhtml);

			// Should process as MHTML, not pass through
			expect(result).not.toContain("MIME-Version");
		});

		it("should detect MHTML by multipart content type", () => {
			const mhtml = `Content-Type: multipart/related
boundary="----=_Part_0"

------=_Part_0
Content-Type: text/html

<html></html>`;

			const result = decodeMhtml(mhtml);

			// Should process as MHTML
			expect(result).not.toContain("multipart");
		});
	});

	describe("HTML extraction", () => {
		it("should extract HTML content from MHTML", () => {
			const mhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_Part_0"

------=_Part_0
Content-Type: text/html

<html><body>Test Content</body></html>

------=_Part_0--`;

			const result = decodeMhtml(mhtml);

			expect(result).toContain("<html>");
			expect(result).toContain("Test Content");
		});

		it("should stop at boundary markers", () => {
			const mhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_Part_0"

------=_Part_0
Content-Type: text/html

<html><body>HTML Part</body></html>

------=_Part_0
Content-Type: text/css

body { color: red; }

------=_Part_0--`;

			const result = decodeMhtml(mhtml);

			expect(result).toContain("HTML Part");
			expect(result).not.toContain("color: red");
		});
	});

	describe("quoted-printable decoding", () => {
		it("should decode quoted-printable encoded content", () => {
			const mhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_Part_0"

------=_Part_0
Content-Type: text/html
Content-Transfer-Encoding: quoted-printable

<html><body class=3D"test">Content</body></html>

------=_Part_0--`;

			const result = decodeMhtml(mhtml);

			// =3D should be decoded to =
			expect(result).toContain('class="test"');
			expect(result).not.toContain("=3D");
		});

		it("should handle soft line breaks in quoted-printable", () => {
			const mhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_Part_0"

------=_Part_0
Content-Type: text/html
Content-Transfer-Encoding: quoted-printable

<html><body>Long line that was =
split across multiple =
lines</body></html>

------=_Part_0--`;

			const result = decodeMhtml(mhtml);

			// Soft line breaks (= at end of line) should be removed
			expect(result).toContain(
				"Long line that was split across multiple lines",
			);
		});

		it("should decode common hex sequences", () => {
			const mhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_Part_0"

------=_Part_0
Content-Type: text/html
Content-Transfer-Encoding: quoted-printable

<html><body>=C3=A9=C3=A8=C3=A0</body></html>

------=_Part_0--`;

			const result = decodeMhtml(mhtml);

			// These are UTF-8 encoded special characters
			// The decoder should convert them
			expect(result).not.toContain("=C3");
		});

		it("should preserve non-encoded content", () => {
			const mhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_Part_0"

------=_Part_0
Content-Type: text/html
Content-Transfer-Encoding: quoted-printable

<html><body>Normal text without encoding</body></html>

------=_Part_0--`;

			const result = decodeMhtml(mhtml);

			expect(result).toContain("Normal text without encoding");
		});
	});

	describe("edge cases", () => {
		it("should handle empty input", () => {
			const result = decodeMhtml("");

			expect(result).toBe("");
		});

		it("should handle MHTML with no HTML section", () => {
			const mhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_Part_0"

------=_Part_0
Content-Type: text/css

body { color: red; }

------=_Part_0--`;

			const result = decodeMhtml(mhtml);

			// Should return empty or minimal content
			expect(typeof result).toBe("string");
		});

		it("should handle different boundary formats", () => {
			const mhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="customBoundary123"

------customBoundary123
Content-Type: text/html

<html><body>Content</body></html>

------customBoundary123--`;

			const result = decodeMhtml(mhtml);

			expect(result).toContain("Content");
		});

		it("should handle Windows line endings", () => {
			const mhtml =
				"MIME-Version: 1.0\r\n" +
				'Content-Type: multipart/related; boundary="----=_Part_0"\r\n' +
				"\r\n" +
				"------=_Part_0\r\n" +
				"Content-Type: text/html\r\n" +
				"\r\n" +
				"<html><body>Content</body></html>\r\n" +
				"\r\n" +
				"------=_Part_0--";

			const result = decodeMhtml(mhtml);

			expect(result).toContain("Content");
		});
	});

	describe("real-world MHTML patterns", () => {
		it("should handle ATP website MHTML structure", () => {
			// Simulated ATP website MHTML format
			const atpMhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_NextPart_001"

------=_NextPart_001
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: quoted-printable

<!DOCTYPE html>
<html>
<head>
  <title>Australian Open 2024 | Draws | ATP Tour | Tennis</title>
</head>
<body>
  <div class=3D"draw draw-round-1">
    <div class=3D"draw-header">Round of 128</div>
    <div class=3D"draw-item">
      <div class=3D"stats-item">
        <div class=3D"player-info">
          <div class=3D"name"><a href=3D"/player">Novak Djokovic</a></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>

------=_NextPart_001
Content-Type: text/css

.draw { display: block; }

------=_NextPart_001--`;

			const result = decodeMhtml(atpMhtml);

			expect(result).toContain("Australian Open 2024");
			expect(result).toContain('class="draw draw-round-1"');
			expect(result).toContain("Novak Djokovic");
			expect(result).not.toContain("display: block"); // CSS should not be included
		});
	});
});
