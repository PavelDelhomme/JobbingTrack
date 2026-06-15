export type SeriesExportValue = string | number | boolean | null | undefined;
export type SeriesExportRow = Record<string, SeriesExportValue>;

function normalizeCell(value: SeriesExportValue): string {
  if (value == null) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  return String(value);
}

function csvEscape(value: SeriesExportValue): string {
  const normalized = normalizeCell(value);
  if (!/[",\n\r;]/.test(normalized)) return normalized;
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function rowsToCsv(rows: SeriesExportRow[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

export function rowsToJson(rows: SeriesExportRow[]): string {
  return `${JSON.stringify(rows, null, 2)}\n`;
}

export function buildSeriesExportFilename(
  baseName: string,
  extension: "csv" | "json",
  date = new Date(),
): string {
  const safeBase = baseName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `${safeBase || "series"}-${stamp}.${extension}`;
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function downloadSeriesRows(
  rows: SeriesExportRow[],
  baseName: string,
  format: "csv" | "json",
): void {
  const content = format === "csv" ? rowsToCsv(rows) : rowsToJson(rows);
  downloadTextFile(
    buildSeriesExportFilename(baseName, format),
    content,
    format === "csv" ? "text/csv;charset=utf-8" : "application/json",
  );
}
