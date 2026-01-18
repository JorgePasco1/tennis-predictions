import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";

export async function POST() {
	// Check if user is admin
	const { userId } = await auth();
	if (!userId) {
		return new Response("Unauthorized", { status: 401 });
	}

	const currentUser = await db.query.users.findFirst({
		where: eq(users.id, userId),
	});

	if (!currentUser || currentUser.role !== "admin") {
		return new Response("Forbidden - Admin only", { status: 403 });
	}

	// Get all users from our database
	const allUsers = await db.query.users.findMany();

	const results = {
		total: allUsers.length,
		updated: 0,
		skipped: 0,
		errors: [] as string[],
	};

	const clerk = await clerkClient();

	// Fetch and update each user
	for (const user of allUsers) {
		try {
			const clerkUser = await clerk.users.getUser(user.clerkId);

			if (clerkUser.imageUrl) {
				await db
					.update(users)
					.set({ imageUrl: clerkUser.imageUrl })
					.where(eq(users.id, user.id));
				results.updated++;
			} else {
				results.skipped++;
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unknown error";
			results.errors.push(`User ${user.id}: ${message}`);
		}
	}

	return Response.json(results);
}
