/**
 * Draw Parser Unit Tests
 *
 * Tests for parsing ATP tournament draws from HTML/MHTML content.
 */

import { describe, expect, it } from "vitest";
import { mockHtmlContent, mockMhtmlContent } from "~/test/fixtures";
import { parseAtpDraw, validateParsedDraw } from "./drawParser";

describe("parseAtpDraw", () => {
	describe("HTML parsing", () => {
		it("should parse valid ATP draw HTML", () => {
			const result = parseAtpDraw(mockHtmlContent.valid_draw);

			expect(result.tournamentName).toBe("Australian Open 2024");
			expect(result.rounds.length).toBeGreaterThan(0);
		});

		it("should extract tournament name from title", () => {
			const result = parseAtpDraw(mockHtmlContent.valid_draw);

			// Should remove " | Draws | ATP Tour | Tennis" suffix
			expect(result.tournamentName).not.toContain("|");
			expect(result.tournamentName).toBe("Australian Open 2024");
		});

		it("should use Unknown Tournament when title is empty", () => {
			const result = parseAtpDraw(mockHtmlContent.empty_html);

			expect(result.tournamentName).toBe("Unknown Tournament");
		});

		it("should parse multiple rounds", () => {
			const result = parseAtpDraw(mockHtmlContent.valid_draw);

			expect(result.rounds.length).toBe(2);
			expect(result.rounds[0]?.name).toBe("Round of 128");
			expect(result.rounds[1]?.name).toBe("Round of 64");
		});

		it("should extract round numbers correctly", () => {
			const result = parseAtpDraw(mockHtmlContent.valid_draw);

			expect(result.rounds[0]?.roundNumber).toBe(1);
			expect(result.rounds[1]?.roundNumber).toBe(2);
		});

		it("should parse matches within rounds", () => {
			const result = parseAtpDraw(mockHtmlContent.valid_draw);

			const firstRound = result.rounds[0];
			expect(firstRound?.matches.length).toBe(2);
		});

		it("should extract player names from matches", () => {
			const result = parseAtpDraw(mockHtmlContent.valid_draw);

			const firstMatch = result.rounds[0]?.matches[0];
			expect(firstMatch?.player1Name).toBe("Novak Djokovic");
			expect(firstMatch?.player2Name).toBe("Dino Prizmic");
		});

		it("should extract player seeds when present", () => {
			const result = parseAtpDraw(mockHtmlContent.valid_draw);

			const firstMatch = result.rounds[0]?.matches[0];
			expect(firstMatch?.player1Seed).toBe(1);
			expect(firstMatch?.player2Seed).toBe(null);
		});

		it("should assign match numbers correctly", () => {
			const result = parseAtpDraw(mockHtmlContent.valid_draw);

			const firstRound = result.rounds[0];
			expect(firstRound?.matches[0]?.matchNumber).toBe(1);
			expect(firstRound?.matches[1]?.matchNumber).toBe(2);
		});

		it("should return empty rounds when no draw structure found", () => {
			const result = parseAtpDraw(mockHtmlContent.no_rounds);

			expect(result.tournamentName).toBe("Test Tournament");
			expect(result.rounds).toEqual([]);
		});

		it("should handle special characters in player names", () => {
			const result = parseAtpDraw(mockHtmlContent.special_characters);

			const firstMatch = result.rounds[0]?.matches[0];
			expect(firstMatch?.player1Name).toBe("Rafael Nadal");
			// Note: Accent characters should be preserved
			expect(firstMatch?.player2Name).toContain("Monfils");
		});
	});

	describe("MHTML parsing", () => {
		it("should decode MHTML format and parse HTML content", () => {
			const result = parseAtpDraw(mockMhtmlContent.simple_mhtml);

			expect(result.tournamentName).toBe("Test Tournament");
			expect(result.rounds.length).toBeGreaterThan(0);
		});

		it("should pass through plain HTML without modification", () => {
			const result = parseAtpDraw(mockMhtmlContent.plain_html);

			expect(result.tournamentName).toBe("Plain HTML");
		});
	});

	describe("edge cases", () => {
		it("should handle empty input", () => {
			const result = parseAtpDraw("");

			expect(result.tournamentName).toBe("Unknown Tournament");
			expect(result.rounds).toEqual([]);
		});

		it("should handle malformed HTML gracefully", () => {
			const malformedHtml = "<html><head><title>Test</title><body>broken";

			// Should not throw
			const result = parseAtpDraw(malformedHtml);
			expect(result.tournamentName).toBe("Test");
		});

		it("should skip matches with missing player information", () => {
			const htmlWithMissingPlayer = `
        <html>
        <head><title>Test Tournament</title></head>
        <body>
          <div class="draw draw-round-1">
            <div class="draw-header">Round 1</div>
            <div class="draw-item">
              <div class="stats-item">
                <div class="player-info">
                  <div class="name"><a href="/player">Player A</a></div>
                </div>
              </div>
              <div class="stats-item">
                <!-- Missing player-info -->
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

			const result = parseAtpDraw(htmlWithMissingPlayer);
			// Match should be skipped because player 2 has no name
			// The round itself is filtered out because it has no valid matches
			expect(result.rounds.length).toBe(0);
		});

		it("should handle rounds with no matches", () => {
			const htmlWithEmptyRound = `
        <html>
        <head><title>Test Tournament</title></head>
        <body>
          <div class="draw draw-round-1">
            <div class="draw-header">Round 1</div>
            <!-- No draw-items -->
          </div>
        </body>
        </html>
      `;

			const result = parseAtpDraw(htmlWithEmptyRound);
			// Empty rounds should be filtered out
			expect(result.rounds.length).toBe(0);
		});

		it("should handle very large seed numbers", () => {
			const htmlWithLargeSeed = `
        <html>
        <head><title>Test Tournament</title></head>
        <body>
          <div class="draw draw-round-1">
            <div class="draw-header">Round 1</div>
            <div class="draw-item">
              <div class="stats-item">
                <div class="player-info">
                  <div class="name"><a href="/player">Player A</a><span>(128)</span></div>
                </div>
              </div>
              <div class="stats-item">
                <div class="player-info">
                  <div class="name"><a href="/player">Player B</a></div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

			const result = parseAtpDraw(htmlWithLargeSeed);
			expect(result.rounds[0]?.matches[0]?.player1Seed).toBe(128);
		});
	});
});

describe("validateParsedDraw", () => {
	describe("valid draws", () => {
		it("should validate a well-formed draw", () => {
			const validDraw = {
				tournamentName: "Australian Open 2024",
				rounds: [
					{
						roundNumber: 1,
						name: "Round of 128",
						matches: [
							{
								matchNumber: 1,
								player1Name: "Novak Djokovic",
								player2Name: "Qualifier",
								player1Seed: 1,
								player2Seed: null,
							},
						],
					},
				],
			};

			const result = validateParsedDraw(validDraw);

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});
	});

	describe("invalid draws", () => {
		it("should detect missing tournament name", () => {
			const draw = {
				tournamentName: "Unknown Tournament",
				rounds: [
					{
						roundNumber: 1,
						name: "Round 1",
						matches: [
							{
								matchNumber: 1,
								player1Name: "Player A",
								player2Name: "Player B",
								player1Seed: null,
								player2Seed: null,
							},
						],
					},
				],
			};

			const result = validateParsedDraw(draw);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain("Tournament name could not be extracted");
		});

		it("should detect empty rounds", () => {
			const draw = {
				tournamentName: "Test Tournament",
				rounds: [],
			};

			const result = validateParsedDraw(draw);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain("No rounds found in the draw");
		});

		it("should detect rounds with no matches", () => {
			const draw = {
				tournamentName: "Test Tournament",
				rounds: [
					{
						roundNumber: 1,
						name: "Round 1",
						matches: [],
					},
				],
			};

			const result = validateParsedDraw(draw);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain("Round 1 has no matches");
		});

		it("should detect matches with missing player names", () => {
			const draw = {
				tournamentName: "Test Tournament",
				rounds: [
					{
						roundNumber: 1,
						name: "Round 1",
						matches: [
							{
								matchNumber: 1,
								player1Name: "Player A",
								player2Name: "", // Empty player name
								player1Seed: null,
								player2Seed: null,
							},
						],
					},
				],
			};

			const result = validateParsedDraw(draw);

			expect(result.valid).toBe(false);
			expect(
				result.errors.some((e) => e.includes("missing player names")),
			).toBe(true);
		});

		it("should collect multiple errors", () => {
			const draw = {
				tournamentName: "Unknown Tournament",
				rounds: [
					{
						roundNumber: 1,
						name: "Round 1",
						matches: [],
					},
				],
			};

			const result = validateParsedDraw(draw);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(1);
		});
	});
});

// =============================================================================
// Integration Tests - Full Parse and Validate Pipeline
// =============================================================================

describe("parseAtpDraw + validateParsedDraw integration", () => {
	it("should parse and validate a complete draw successfully", () => {
		const parsed = parseAtpDraw(mockHtmlContent.valid_draw);
		const validation = validateParsedDraw(parsed);

		expect(validation.valid).toBe(true);
	});

	it("should correctly identify invalid draws after parsing", () => {
		const parsed = parseAtpDraw(mockHtmlContent.no_rounds);
		const validation = validateParsedDraw(parsed);

		expect(validation.valid).toBe(false);
	});
});
