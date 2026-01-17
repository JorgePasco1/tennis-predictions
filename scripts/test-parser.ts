#!/usr/bin/env node
/**
 * CLI tool for testing the ATP draw parser
 *
 * Usage: pnpm test:parser <path-to-mhtml-or-html-file>
 *
 * Reads an MHTML or HTML file, parses it using the same parseAtpDraw() function
 * used by the production endpoint, validates the result, and outputs to a JSON file.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
	parseAtpDraw,
	validateParsedDraw,
} from "../src/server/services/drawParser.js";

// ANSI color codes for terminal output
const colors = {
	reset: "\x1b[0m",
	green: "\x1b[32m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	dim: "\x1b[2m",
};

function printError(message: string): void {
	console.error(`${colors.red}✗ Error:${colors.reset} ${message}`);
}

function printSuccess(message: string): void {
	console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function printInfo(label: string, value: string | number): void {
	console.log(`${colors.cyan}${label}:${colors.reset} ${value}`);
}

function main(): void {
	// Parse command line arguments
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.error("Usage: pnpm test:parser <path-to-mhtml-or-html-file>");
		console.error("\nExample:");
		console.error("  pnpm test:parser australian-open.mhtml");
		console.error("  pnpm test:parser path/to/draw.html");
		process.exit(1);
	}

	const inputPath = args[0];
	if (!inputPath) {
		printError("No file path provided");
		process.exit(1);
	}

	// Resolve to absolute path
	const absolutePath = resolve(inputPath);

	// Check if file exists
	if (!existsSync(absolutePath)) {
		printError(`File not found: ${inputPath}`);
		process.exit(1);
	}

	console.log(
		`\n${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
	);
	console.log(`${colors.cyan}ATP Draw Parser - CLI Test${colors.reset}`);
	console.log(
		`${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`,
	);

	printInfo("Parsing", basename(absolutePath));

	try {
		// Read file content
		const fileContent = readFileSync(absolutePath, "utf-8");

		// Parse the draw using the same function as the production endpoint
		const parsedDraw = parseAtpDraw(fileContent);

		// Validate the result
		const validation = validateParsedDraw(parsedDraw);

		// Calculate total matches across all rounds
		const totalMatches = parsedDraw.rounds.reduce(
			(sum, round) => sum + round.matches.length,
			0,
		);

		// Print summary
		console.log();
		printInfo("Tournament", parsedDraw.tournamentName);
		printInfo("Rounds found", parsedDraw.rounds.length.toString());
		printInfo("Total matches", totalMatches.toString());

		// Print round details
		if (parsedDraw.rounds.length > 0) {
			console.log(`\n${colors.dim}Rounds breakdown:${colors.reset}`);
			for (const round of parsedDraw.rounds) {
				console.log(
					`  ${colors.dim}•${colors.reset} Round ${round.roundNumber}: ${round.name} (${round.matches.length} matches)`,
				);
			}
		}

		console.log();

		// Print validation result
		if (validation.valid) {
			printSuccess("VALID - All validation checks passed");
		} else {
			console.log(`${colors.yellow}⚠ VALIDATION WARNINGS:${colors.reset}`);
			for (const error of validation.errors) {
				console.log(`  ${colors.yellow}•${colors.reset} ${error}`);
			}
		}

		// Create output directory if it doesn't exist
		const outputDir = join(
			dirname(new URL(import.meta.url).pathname),
			"output",
		);
		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true });
		}

		// Generate output filename
		const inputBasename = basename(absolutePath);
		const outputFilename = inputBasename.replace(
			/\.(mhtml|html)$/i,
			"-parsed.json",
		);
		const outputPath = join(outputDir, outputFilename);

		// Write output to JSON file
		writeFileSync(outputPath, JSON.stringify(parsedDraw, null, 2), "utf-8");

		console.log();
		printSuccess(
			`Output saved to: ${colors.dim}scripts/output/${outputFilename}${colors.reset}`,
		);

		console.log(
			`\n${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`,
		);

		// Exit with success code
		process.exit(0);
	} catch (error) {
		console.log();
		printError(error instanceof Error ? error.message : String(error));

		if (error instanceof Error && error.stack) {
			console.error(`\n${colors.dim}Stack trace:${colors.reset}`);
			console.error(error.stack);
		}

		console.log(
			`\n${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`,
		);

		process.exit(1);
	}
}

main();
