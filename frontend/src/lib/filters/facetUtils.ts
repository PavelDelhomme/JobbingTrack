import type { FacetOption } from "./types";

export function uniqueSortedValues(
  values: Array<string | undefined | null>,
): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "fr"));
}

export function facetValues(options?: FacetOption[]): string[] {
  return (options || [])
    .map((option) => option.value?.trim())
    .filter((value): value is string => Boolean(value));
}

export function mergeFacetSuggestions(
  facetOptions: FacetOption[] | undefined,
  dynamicValues: Array<string | undefined | null>,
  limit = 80,
): string[] {
  return uniqueSortedValues([
    ...facetValues(facetOptions),
    ...dynamicValues,
  ]).slice(0, limit);
}

export function facetOptionsFromValues(
  values: Array<string | undefined | null>,
  formatLabel?: (value: string) => string,
): FacetOption[] {
  return uniqueSortedValues(values).map((value) => ({
    value,
    label: formatLabel ? formatLabel(value) : value,
  }));
}
