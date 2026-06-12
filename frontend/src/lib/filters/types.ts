export type FacetOption = {
  value: string;
  count?: number;
  label?: string;
};

export type FacetGroups = Record<string, FacetOption[] | undefined>;

export type FilterBadge = {
  key: string;
  label: string;
};
