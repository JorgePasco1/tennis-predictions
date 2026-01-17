import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { parseAtpDraw, validateParsedDraw } from "~/server/services/drawParser";

/**
 * REST endpoint for uploading and parsing ATP draw files
 * Uses FormData to handle large file uploads (avoids JSON body size limits)
 * This also bypasses tRPC to avoid the known streaming bug with large POST bodies
 * https://github.com/trpc/trpc/issues/5725
 */
export async function POST(request: NextRequest) {
	try {
		// Check authentication
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Check admin role
		const role = user.publicMetadata.role as string | undefined;
		if (role !== "admin") {
			return NextResponse.json(
				{ error: "Forbidden - Admin access required" },
				{ status: 403 },
			);
		}

		// Parse FormData from the request
		const formData = await request.formData();
		const file = formData.get("file") as File | null;
		const yearStr = formData.get("year") as string | null;

		if (!file) {
			return NextResponse.json(
				{ error: "Missing file in form data" },
				{ status: 400 },
			);
		}

		const year = yearStr ? Number.parseInt(yearStr, 10) : null;
		if (!year || year < 2000 || year > 2100) {
			return NextResponse.json(
				{ error: "Missing or invalid year (must be between 2000 and 2100)" },
				{ status: 400 },
			);
		}

		// Read file content as text
		let htmlContent: string;
		try {
			htmlContent = await file.text();
		} catch (readError) {
			return NextResponse.json(
				{
					error: `Failed to read file: ${readError instanceof Error ? readError.message : String(readError)}`,
				},
				{ status: 400 },
			);
		}

		// Parse the draw
		const parsedDraw = parseAtpDraw(htmlContent);

		// Validate the parsed draw
		const validation = validateParsedDraw(parsedDraw);

		if (!validation.valid) {
			return NextResponse.json(
				{ error: `Failed to parse draw: ${validation.errors.join(", ")}` },
				{ status: 400 },
			);
		}

		const result = {
			...parsedDraw,
			year,
		};

		// Log success
		const totalMatches = result.rounds.reduce(
			(sum, round) => sum + round.matches.length,
			0,
		);
		console.log(
			`✅ Upload parsed successfully. Tournament: ${result.tournamentName}, Rounds: ${result.rounds.length}, Matches: ${totalMatches}`,
		);

		return NextResponse.json(result);
	} catch (error) {
		console.error("Error parsing draw:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			},
			{ status: 500 },
		);
	}
}

// Configure the route for large payloads
export const maxDuration = 60;
export const dynamic = "force-dynamic";
