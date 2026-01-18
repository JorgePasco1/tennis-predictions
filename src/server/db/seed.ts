import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { achievementDefinitions } from "./schema";
import { ACHIEVEMENT_DEFINITIONS } from "../services/achievements";

// Load .env file manually for standalone script
function loadEnv() {
	try {
		const envPath = resolve(process.cwd(), ".env");
		const envContent = readFileSync(envPath, "utf-8");
		for (const line of envContent.split("\n")) {
			const trimmedLine = line.trim();
			if (trimmedLine && !trimmedLine.startsWith("#")) {
				const [key, ...valueParts] = trimmedLine.split("=");
				if (key && valueParts.length > 0) {
					const value = valueParts.join("=").replace(/^["']|["']$/g, "");
					if (!process.env[key]) {
						process.env[key] = value;
					}
				}
			}
		}
	} catch {
		// .env file doesn't exist, continue with existing env vars
	}
}

loadEnv();

// Create a standalone database connection for seeding
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error("DATABASE_URL is not set");
	process.exit(1);
}

const conn = postgres(databaseUrl);
const db = drizzle(conn);

async function seed() {
	console.log("Seeding achievement definitions...");

	// Insert achievement definitions (upsert to avoid duplicates)
	for (const achievement of ACHIEVEMENT_DEFINITIONS) {
		await db
			.insert(achievementDefinitions)
			.values({
				code: achievement.code,
				name: achievement.name,
				description: achievement.description,
				category: achievement.category,
				badgeColor: achievement.badgeColor,
				threshold: achievement.threshold ?? null,
			})
			.onConflictDoUpdate({
				target: achievementDefinitions.code,
				set: {
					name: achievement.name,
					description: achievement.description,
					category: achievement.category,
					badgeColor: achievement.badgeColor,
					threshold: achievement.threshold ?? null,
				},
			});
		console.log(`  - ${achievement.name} (${achievement.code})`);
	}

	console.log("Seeding complete!");
}

seed()
	.then(async () => {
		await conn.end();
		process.exit(0);
	})
	.catch(async (error) => {
		console.error("Seeding failed:", error);
		await conn.end();
		process.exit(1);
	});
