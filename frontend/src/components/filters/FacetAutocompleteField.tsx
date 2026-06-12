"use client";

import {
  AutocompleteInput,
  type AutocompleteSuggestion,
} from "@/components/ui/autocomplete-input";
import type { FacetOption } from "@/lib/filters/types";

type FacetAutocompleteFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[] | FacetOption[];
  loading?: boolean;
  placeholder?: string;
  formatSuggestion?: (value: string) => string;
};

function toAutocompleteSuggestions(
  suggestions: string[] | FacetOption[],
  formatSuggestion?: (value: string) => string,
): AutocompleteSuggestion[] {
  return suggestions.map((suggestion) => {
    if (typeof suggestion === "string") {
      return {
        value: suggestion,
        label: formatSuggestion ? formatSuggestion(suggestion) : suggestion,
      };
    }

    return {
      value: suggestion.value,
      label:
        suggestion.label ||
        (formatSuggestion
          ? formatSuggestion(suggestion.value)
          : suggestion.value),
    };
  });
}

export function FacetAutocompleteField({
  label,
  value,
  onChange,
  suggestions,
  loading = false,
  placeholder,
  formatSuggestion,
}: FacetAutocompleteFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <AutocompleteInput
        value={value}
        onChange={onChange}
        suggestions={toAutocompleteSuggestions(suggestions, formatSuggestion)}
        loading={loading}
        placeholder={placeholder}
        variant="plain"
        className="w-full"
      />
    </label>
  );
}
