"use client";

import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

interface TimeRemaining {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	total: number;
}

interface CountdownTimerProps {
	deadline: Date | string | null;
	opensAt?: Date | string | null;
	className?: string;
	showSeconds?: boolean;
	onExpire?: () => void;
}

function calculateTimeRemaining(deadline: Date): TimeRemaining {
	const now = new Date().getTime();
	const target = new Date(deadline).getTime();
	const total = target - now;

	if (total <= 0) {
		return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
	}

	const days = Math.floor(total / (1000 * 60 * 60 * 24));
	const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((total % (1000 * 60)) / 1000);

	return { days, hours, minutes, seconds, total };
}

function getUrgencyColor(timeRemaining: TimeRemaining): string {
	const hoursLeft = timeRemaining.days * 24 + timeRemaining.hours;

	if (hoursLeft <= 1) {
		return "text-red-600 dark:text-red-400";
	}
	if (hoursLeft <= 6) {
		return "text-amber-600 dark:text-amber-400";
	}
	if (hoursLeft <= 24) {
		return "text-yellow-600 dark:text-yellow-400";
	}
	return "text-green-600 dark:text-green-400";
}

function getUrgencyBg(timeRemaining: TimeRemaining): string {
	const hoursLeft = timeRemaining.days * 24 + timeRemaining.hours;

	if (hoursLeft <= 1) {
		return "bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800";
	}
	if (hoursLeft <= 6) {
		return "bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800";
	}
	if (hoursLeft <= 24) {
		return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/50 dark:border-yellow-800";
	}
	return "bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800";
}

export function CountdownTimer({
	deadline,
	opensAt,
	className,
	showSeconds = true,
	onExpire,
}: CountdownTimerProps) {
	const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(
		null,
	);
	const [isOpen, setIsOpen] = useState(false);
	const [hasExpired, setHasExpired] = useState(false);

	useEffect(() => {
		if (!deadline) return;

		const deadlineDate = new Date(deadline);

		const updateTimer = () => {
			const now = new Date();

			// Check if submissions should be open
			if (opensAt) {
				const opensAtDate = new Date(opensAt);
				setIsOpen(now >= opensAtDate);
			} else {
				setIsOpen(true);
			}

			const remaining = calculateTimeRemaining(deadlineDate);
			setTimeRemaining(remaining);

			if (remaining.total <= 0 && !hasExpired) {
				setHasExpired(true);
				onExpire?.();
			}
		};

		updateTimer();
		const interval = setInterval(updateTimer, 1000);

		return () => clearInterval(interval);
	}, [deadline, opensAt, hasExpired, onExpire]);

	// No deadline set
	if (!deadline) {
		return (
			<div
				className={cn(
					"inline-flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-muted-foreground text-sm",
					className,
				)}
			>
				<span className="text-base">-</span>
				<span>No deadline set</span>
			</div>
		);
	}

	// Not open yet
	if (opensAt && !isOpen) {
		const opensAtDate = new Date(opensAt);
		return (
			<div
				className={cn(
					"inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-800 dark:bg-blue-950/50",
					className,
				)}
			>
				<span className="text-base">-</span>
				<div className="flex flex-col">
					<span className="font-medium text-blue-600 dark:text-blue-400">
						Opens{" "}
						{opensAtDate.toLocaleDateString(undefined, {
							weekday: "short",
							month: "short",
							day: "numeric",
						})}
					</span>
					<span className="text-blue-500 text-xs dark:text-blue-500">
						at{" "}
						{opensAtDate.toLocaleTimeString(undefined, {
							hour: "numeric",
							minute: "2-digit",
						})}
					</span>
				</div>
			</div>
		);
	}

	// Expired
	if (hasExpired || (timeRemaining && timeRemaining.total <= 0)) {
		return (
			<div
				className={cn(
					"inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800",
					className,
				)}
			>
				<span className="text-base">-</span>
				<span className="font-medium text-gray-600 dark:text-gray-400">
					Submissions Closed
				</span>
			</div>
		);
	}

	// Loading
	if (!timeRemaining) {
		return (
			<div
				className={cn(
					"inline-flex animate-pulse items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm",
					className,
				)}
			>
				<span className="h-4 w-24 rounded bg-muted" />
			</div>
		);
	}

	const urgencyColor = getUrgencyColor(timeRemaining);
	const urgencyBg = getUrgencyBg(timeRemaining);

	return (
		<div
			className={cn(
				"inline-flex items-center gap-3 rounded-lg border px-3 py-2",
				urgencyBg,
				className,
			)}
		>
			<div className={cn("flex items-center gap-1 font-mono", urgencyColor)}>
				{timeRemaining.days > 0 && (
					<>
						<TimeUnit label="d" value={timeRemaining.days} />
						<span className="text-muted-foreground">:</span>
					</>
				)}
				<TimeUnit label="h" value={timeRemaining.hours} />
				<span className="text-muted-foreground">:</span>
				<TimeUnit label="m" value={timeRemaining.minutes} />
				{showSeconds && (
					<>
						<span className="text-muted-foreground">:</span>
						<TimeUnit label="s" value={timeRemaining.seconds} />
					</>
				)}
			</div>
			<span className={cn("font-medium text-xs", urgencyColor)}>remaining</span>
		</div>
	);
}

function TimeUnit({ value, label }: { value: number; label: string }) {
	return (
		<span className="tabular-nums">
			{value.toString().padStart(2, "0")}
			<span className="text-xs opacity-70">{label}</span>
		</span>
	);
}

// Compact version for smaller displays
export function CountdownTimerCompact({
	deadline,
	opensAt,
	className,
}: Omit<CountdownTimerProps, "showSeconds">) {
	const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(
		null,
	);
	const [isOpen, setIsOpen] = useState(false);
	const [hasExpired, setHasExpired] = useState(false);

	useEffect(() => {
		if (!deadline) return;

		const deadlineDate = new Date(deadline);

		const updateTimer = () => {
			const now = new Date();

			if (opensAt) {
				const opensAtDate = new Date(opensAt);
				setIsOpen(now >= opensAtDate);
			} else {
				setIsOpen(true);
			}

			const remaining = calculateTimeRemaining(deadlineDate);
			setTimeRemaining(remaining);

			if (remaining.total <= 0 && !hasExpired) {
				setHasExpired(true);
			}
		};

		updateTimer();
		const interval = setInterval(updateTimer, 1000);

		return () => clearInterval(interval);
	}, [deadline, opensAt, hasExpired]);

	if (!deadline) {
		return (
			<span className={cn("text-muted-foreground text-sm", className)}>-</span>
		);
	}

	if (opensAt && !isOpen) {
		return (
			<span
				className={cn("text-blue-600 text-sm dark:text-blue-400", className)}
			>
				Not yet open
			</span>
		);
	}

	if (hasExpired || (timeRemaining && timeRemaining.total <= 0)) {
		return (
			<span className={cn("text-gray-500 text-sm", className)}>Closed</span>
		);
	}

	if (!timeRemaining) {
		return <span className={cn("animate-pulse text-sm", className)}>...</span>;
	}

	const urgencyColor = getUrgencyColor(timeRemaining);

	const parts: string[] = [];
	if (timeRemaining.days > 0) parts.push(`${timeRemaining.days}d`);
	if (timeRemaining.hours > 0 || timeRemaining.days > 0)
		parts.push(`${timeRemaining.hours}h`);
	parts.push(`${timeRemaining.minutes}m`);

	return (
		<span className={cn("font-mono text-sm", urgencyColor, className)}>
			{parts.join(" ")}
		</span>
	);
}
