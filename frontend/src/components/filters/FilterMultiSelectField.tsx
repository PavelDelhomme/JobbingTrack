"use client";

import {
  parseMultiFilterValues,
  serializeMultiFilterValues,
} from "@/lib/filters/multiValueFilter";

type FilterMultiSelectOption = {
  value: string;
  label: string;
};

type FilterMultiSelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterMultiSelectOption[];
  hint?: string;
};

export function FilterMultiSelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: FilterMultiSelectFieldProps) {
  const selected = new Set(
    parseMultiFilterValues(value).map((token) => token.toLowerCase()),
  );

  const toggle = (optionValue: string) => {
    const tokens = parseMultiFilterValues(value);
    const index = tokens.findIndex(
      (token) => token.toLowerCase() === optionValue.toLowerCase(),
    );
    if (index >= 0) {
      tokens.splice(index, 1);
    } else {
      tokens.push(optionValue);
    }
    onChange(serializeMultiFilterValues(tokens));
  };

  return (
    <fieldset className="flex min-w-0 flex-col gap-2 text-sm">
      <legend className="font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = selected.has(option.value.toLowerCase());
          return (
            <label
              key={option.value}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                checked
                  ? "border-red-400 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100"
                  : "border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              <input
                type="checkbox"
                className="rounded border-gray-300 dark:border-gray-600"
                checked={checked}
                onChange={() => toggle(option.value)}
                aria-label={`${label}: ${option.label}`}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
      {hint ? (
        <p className="text-xs font-normal text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}
