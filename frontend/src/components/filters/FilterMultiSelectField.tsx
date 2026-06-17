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
  /** `security` = rouge (défaut incidents/menaces), `statistics` = violet/indigo */
  variant?: "security" | "statistics";
  /** Surcharge la classe de chaque pill (ex. couleurs par niveau de log). */
  toneForValue?: (value: string, checked: boolean) => string;
  /** Masque la case à cocher native pour un rendu pill uniquement. */
  hideCheckbox?: boolean;
};

function defaultChipClass(
  checked: boolean,
  variant: "security" | "statistics",
): string {
  if (checked) {
    if (variant === "statistics") {
      return "border-violet-500 bg-violet-50 text-violet-950 shadow-sm dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-100";
    }
    return "border-red-400 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100";
  }
  return "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:border-gray-500";
}

export function FilterMultiSelectField({
  label,
  value,
  onChange,
  options,
  hint,
  variant = "security",
  toneForValue,
  hideCheckbox = false,
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
      <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = selected.has(option.value.toLowerCase());
          const chipClass =
            toneForValue?.(option.value, checked) ??
            defaultChipClass(checked, variant);
          return (
            <label
              key={option.value}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${chipClass}`}
            >
              <input
                type="checkbox"
                className={
                  hideCheckbox
                    ? "sr-only"
                    : "rounded border-gray-300 dark:border-gray-600"
                }
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
