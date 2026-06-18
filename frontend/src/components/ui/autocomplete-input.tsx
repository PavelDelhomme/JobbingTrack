"use client";

import { useState, useEffect, useRef } from "react";
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { Search, X, Loader2 } from "@/lib/icons";

export type AutocompleteSuggestion =
  | string
  | {
      value: string;
      label?: string;
    };

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  placeholder?: string;
  suggestions: AutocompleteSuggestion[];
  loading?: boolean;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  variant?: "search" | "plain";
  maxSuggestions?: number;
}

function normalizeSuggestions(suggestions: AutocompleteSuggestion[]) {
  return suggestions.map((suggestion) =>
    typeof suggestion === "string"
      ? { value: suggestion, label: suggestion }
      : {
          value: suggestion.value,
          label: suggestion.label || suggestion.value,
        },
  );
}

export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder = "Rechercher...",
  suggestions,
  loading = false,
  className = "",
  disabled = false,
  required = false,
  variant = "search",
  maxSuggestions = 10,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const normalizedSuggestions = normalizeSuggestions(suggestions);

  const filteredSuggestions = normalizedSuggestions
    .filter((suggestion) => {
      const query = value.toLowerCase();
      return (
        suggestion.value.toLowerCase().includes(query) ||
        suggestion.label.toLowerCase().includes(query)
      );
    })
    .slice(0, maxSuggestions);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelect = (suggestion: { value: string; label: string }) => {
    onChange(suggestion.value);
    onSelect?.(suggestion.value);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelect(filteredSuggestions[highlightedIndex]);
        } else if (filteredSuggestions.length === 1) {
          handleSelect(filteredSuggestions[0]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const inputClassName =
    variant === "plain"
      ? "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      : "w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        {variant === "search" && (
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={inputClassName}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {isOpen && (filteredSuggestions.length > 0 || loading) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            </div>
          ) : filteredSuggestions.length > 0 ? (
            <ul className="py-1">
              {filteredSuggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.value}-${index}`}
                  onClick={() => handleSelect(suggestion)}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    index === highlightedIndex
                      ? "bg-gray-100 dark:bg-gray-700"
                      : ""
                  }`}
                >
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {suggestion.label
                      .split(new RegExp(`(${value})`, "gi"))
                      .map((part, i) => (
                        <span
                          key={i}
                          className={
                            part.toLowerCase() === value.toLowerCase()
                              ? "font-semibold text-blue-600 dark:text-blue-400"
                              : ""
                          }
                        >
                          {part}
                        </span>
                      ))}
                  </div>
                  {suggestion.label !== suggestion.value && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {suggestion.value}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            value && (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                Aucune suggestion trouvée
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
