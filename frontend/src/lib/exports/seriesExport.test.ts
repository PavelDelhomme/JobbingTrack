import {
  buildSeriesExportFilename,
  rowsToCsv,
  rowsToJson,
} from "./seriesExport";

describe("seriesExport", () => {
  it("exporte les lignes en CSV avec union des colonnes et échappement", () => {
    expect(
      rowsToCsv([
        { timestamp: "2026-06-15T10:00:00Z", value: 1.23 },
        { timestamp: "2026-06-15T10:01:00Z", note: "a,b" },
      ]),
    ).toBe(
      'timestamp,value,note\n2026-06-15T10:00:00Z,1.23,\n2026-06-15T10:01:00Z,,"a,b"\n',
    );
  });

  it("exporte les lignes en JSON stable et lisible", () => {
    expect(rowsToJson([{ service: "api-gateway", cpu: 12 }])).toBe(
      '[\n  {\n    "service": "api-gateway",\n    "cpu": 12\n  }\n]\n',
    );
  });

  it("génère un nom de fichier sûr", () => {
    expect(
      buildSeriesExportFilename(
        "Performances Réseau / RX TX",
        "csv",
        new Date("2026-06-15T10:00:00.000Z"),
      ),
    ).toBe("performances-reseau-rx-tx-2026-06-15T10-00-00-000Z.csv");
  });
});
