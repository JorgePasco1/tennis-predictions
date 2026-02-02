import { cn } from "~/lib/utils";

interface ServerAvatarProps {
	src: string | null | undefined;
	alt: string;
	fallback: string;
	className?: string;
	fallbackClassName?: string;
}

/**
 * Server-safe avatar component that doesn't require client-side JS.
 * Uses CSS to handle image loading failures with a fallback.
 */
export function ServerAvatar({
	src,
	alt,
	fallback,
	className,
	fallbackClassName,
}: ServerAvatarProps) {
	// If no image URL, show fallback directly
	if (!src) {
		return (
			<div
				className={cn(
					"relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted",
					className,
				)}
			>
				<span className={cn("text-muted-foreground", fallbackClassName)}>
					{fallback}
				</span>
			</div>
		);
	}

	// With image URL, use object-fit with fallback background
	return (
		<div
			className={cn(
				"relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted",
				className,
			)}
		>
			{/* Fallback text shown behind the image */}
			<span className={cn("absolute text-muted-foreground", fallbackClassName)}>
				{fallback}
			</span>
			{/* Image overlays the fallback when loaded successfully */}
			<img
				alt={alt}
				className="relative z-10 aspect-square h-full w-full object-cover"
				src={src}
			/>
		</div>
	);
}

/**
 * Get initials from a display name for avatar fallback
 */
export function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}
