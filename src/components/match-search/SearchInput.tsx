import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";

interface SearchInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

export function SearchInput({
	value,
	onChange,
	placeholder = "Search by player name...",
}: SearchInputProps) {
	return (
		<div className="relative">
			<Search className="absolute top-3 left-3 h-5 w-5 text-gray-400" />
			<Input
				className="pl-10 text-base"
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				type="text"
				value={value}
			/>
		</div>
	);
}
