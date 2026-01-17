import type { WebhookEvent } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { env } from "~/env";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";

export async function POST(req: Request) {
	// Verify the webhook signature
	const WEBHOOK_SECRET = env.CLERK_WEBHOOK_SECRET;

	if (!WEBHOOK_SECRET) {
		throw new Error(
			"Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env",
		);
	}

	const headerPayload = await headers();
	const svix_id = headerPayload.get("svix-id");
	const svix_timestamp = headerPayload.get("svix-timestamp");
	const svix_signature = headerPayload.get("svix-signature");

	if (!svix_id || !svix_timestamp || !svix_signature) {
		return new Response("Error occurred -- no svix headers", {
			status: 400,
		});
	}

	const payload = await req.json();
	const body = JSON.stringify(payload);

	const wh = new Webhook(WEBHOOK_SECRET);

	let evt: WebhookEvent;

	try {
		evt = wh.verify(body, {
			"svix-id": svix_id,
			"svix-timestamp": svix_timestamp,
			"svix-signature": svix_signature,
		}) as WebhookEvent;
	} catch (err) {
		console.error("Error verifying webhook:", err);
		return new Response("Error occurred", {
			status: 400,
		});
	}

	const eventType = evt.type;

	if (eventType === "user.created" || eventType === "user.updated") {
		const {
			id,
			email_addresses,
			first_name,
			last_name,
			username,
			public_metadata,
		} = evt.data;

		// Get display name (prioritize: firstName + lastName, then username, then email)
		const email = email_addresses[0]?.email_address ?? "";
		let displayName = "";

		if (first_name && last_name) {
			displayName = `${first_name} ${last_name}`;
		} else if (first_name) {
			displayName = first_name;
		} else if (username) {
			displayName = username;
		} else {
			displayName = email.split("@")[0] ?? "User";
		}

		// Get role from public metadata
		const role =
			(public_metadata?.role as "user" | "admin" | undefined) ?? "user";

		// Upsert user to database
		try {
			await db
				.insert(users)
				.values({
					id,
					clerkId: id,
					email,
					displayName,
					role,
				})
				.onConflictDoUpdate({
					target: users.clerkId,
					set: {
						email,
						displayName,
						role,
					},
				});

			console.log(
				`User ${eventType === "user.created" ? "created" : "updated"}: ${id}`,
			);
		} catch (error) {
			console.error("Error syncing user to database:", error);
			return new Response("Error syncing user", {
				status: 500,
			});
		}
	}

	return new Response("", { status: 200 });
}
