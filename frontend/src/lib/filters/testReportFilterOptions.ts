export const TEST_REPORT_STATUS_OPTIONS = [
  { value: "success", label: "Réussis" },
  { value: "failed", label: "Échoués" },
  { value: "partial", label: "Partiels" },
] as const;

export const TEST_REPORT_SORT_OPTIONS = [
  { value: "date", label: "Date (récent d'abord)" },
  { value: "tests", label: "Nombre de tests" },
  { value: "passed", label: "Tests réussis" },
  { value: "failed", label: "Tests échoués" },
] as const;

export type TestReportSortBy =
  (typeof TEST_REPORT_SORT_OPTIONS)[number]["value"];

export type TestReportListFilters = {
  query: string;
  status: string;
  category: string;
  sortBy: TestReportSortBy;
};

export const DEFAULT_TEST_REPORT_FILTERS: TestReportListFilters = {
  query: "",
  status: "",
  category: "",
  sortBy: "date",
};
