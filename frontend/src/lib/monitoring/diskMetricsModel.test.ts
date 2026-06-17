import {
  diskVolumeAxisMaxGb,
  normalizeDiskSystemRows,
  pickDiskGb,
} from "./diskMetricsModel";

describe("diskMetricsModel", () => {
  it("lit les octets et alias Go", () => {
    expect(
      pickDiskGb(
        { diskUsedBytes: 1024 ** 3 * 2 },
        ["disk_used_gb"],
        ["diskUsedBytes"],
      ),
    ).toBeCloseTo(2, 5);
    expect(pickDiskGb({ disk_used_gb: 128 }, ["disk_used_gb"], [])).toBe(128);
  });

  it("dérive utilisé/total depuis libre ou pourcentage", () => {
    const [row] = normalizeDiskSystemRows([
      {
        timestamp: "2026-06-17T12:00:00.000Z",
        diskUsagePercent: 50,
        diskTotalBytes: 1024 ** 3 * 200,
      },
    ]);
    expect(row.used).toBeCloseTo(100, 3);
    expect(row.total).toBeCloseTo(200, 3);
  });

  it("calcule un max d’axe volume", () => {
    expect(
      diskVolumeAxisMaxGb([
        {
          timestamp: "t",
          timeMs: 1,
          usage: 50,
          used: 100,
          total: 200,
        },
      ]),
    ).toBeCloseTo(216, 3);
  });
});
