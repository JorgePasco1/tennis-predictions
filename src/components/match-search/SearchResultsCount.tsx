interface SearchResultsCountProps {
	searchQuery: string;
	filteredCount: number;
	totalCount: number;
	className?: string;
}

export function SearchResultsCount({
	searchQuery,
	filteredCount,
	totalCount,
	className = "text-gray-600 text-sm",
}: SearchResultsCountProps) {
	if (!searchQuery.trim()) return null;

	return (
		<div className={className}>
			Showing {filteredCount} of {totalCount} matches
			{filteredCount === 0 && " - No matches found"}
		</div>
	);
}
