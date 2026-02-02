import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("tournament detail layout", () => {
	it("should place quick links before alerts and tabs", () => {
		const filePath = path.resolve(
			process.cwd(),
			"src/app/tournaments/[slug]/page.tsx",
		);
		const content = readFileSync(filePath, "utf8");

		const quickLinksIndex = content.indexOf("/* Quick Links */");
		const activeAlertIndex = content.indexOf("/* Active Round Alert */");
		const tabsIndex = content.indexOf("/* Bracket & Leaderboard Tabs */");

		expect(quickLinksIndex).toBeGreaterThanOrEqual(0);
		expect(activeAlertIndex).toBeGreaterThanOrEqual(0);
		expect(tabsIndex).toBeGreaterThanOrEqual(0);
		expect(quickLinksIndex).toBeLessThan(activeAlertIndex);
		expect(quickLinksIndex).toBeLessThan(tabsIndex);
	});
});
