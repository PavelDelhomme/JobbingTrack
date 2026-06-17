"use client";

import { useMemo, useState } from "react";
import {
  AutocompleteInput,
  type AutocompleteSuggestion,
} from "@/components/ui/autocomplete-input";
import type { FacetOption } from "@/lib/filters/types";
import {
  parseMultiFilterValues,
  serializeMultiFilterValues,
} from "@/lib/filters/multiValueFilter";
import { X } from "@/lib/icons";

type FacetMultiValueFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[] | FacetOption[];
  loading?: boolean;
  placeholder?: string;
  formatSuggestion?: (value: string) => string;
  hint?: string;
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

export function FacetMultiValueField({
  label,
  value,
  onChange,
  suggestions,
  loading = false,
  placeholder,
  formatSuggestion,
  hint,
}: FacetMultiValueFieldProps) {
  const tokens = useMemo(() => parseMultiFilterValues(value), [value]);
  const [inputValue, setInputValue] = useState("");

  const addToken = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const next = [...tokens];
    if (!next.some((token) => token.toLowerCase() === trimmed.toLowerCase())) {
      next.push(trimmed);
      onChange(serializeMultiFilterValues(next));
    }
    setInputValue("");
  };

  const removeToken = (tokenToRemove: string) => {
    onChange(
      serializeMultiFilterValues(
        tokens.filter(
          (token) => token.toLowerCase() !== tokenToRemove.toLowerCase(),
        ),
      ),
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm font-medium">
      <span>{label}</span>
      {tokens.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tokens.map((token) => (
            <span
              key={token}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-normal text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              {formatSuggestion ? formatSuggestion(token) : token}
              <button
                type="button"
                onClick={() => removeToken(token)}
                className="rounded p-0.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                aria-label={`Retirer ${token}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <AutocompleteInput
        value={inputValue}
        onChange={(nextValue) => {
          if (/[,;|]/.test(nextValue)) {
            nextValue
              .split(/[,;|]/)
              .map((part) => part.trim())
              .filter(Boolean)
              .forEach((part) => addToken(part));
            return;
          }
          setInputValue(nextValue);
        }}
        onSelect={(selected) => addToken(selected)}
        suggestions={toAutocompleteSuggestions(suggestions, formatSuggestion)}
        loading={loading}
        placeholder={placeholder}
        variant="plain"
        className="w-full"
      />
      {hint ? (
        <p className="text-xs font-normal text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
