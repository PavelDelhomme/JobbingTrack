import {
  appendBlockIoRates,
  blockIoFromMetricRow,
  bytesToMb,
  hasBlockIoSeries,
} from "./containerBlockIoChartModel";

describe("containerBlockIoChartModel", () => {
  it("convertit les bytes en Mo", () => {
    expect(bytesToMb(1048576)).toBe(1);
  });

  it("lit blockReadBytes depuis l historique", () => {
    expect(
      blockIoFromMetricRow({
        blockReadBytes: 2_940_000_000,
        blockWriteBytes: 3_610_000_000,
      }).readMb,
    ).toBeCloseTo(2803.8, 0);
  });

  it("dérive un débit Mo/min", () => {
    const rows = appendBlockIoRates([
      { timeMs: 0, readMb: 100, writeMb: 50, readMbPerMin: null, writeMbPerMin: null },
      { timeMs: 60_000, readMb: 106, writeMb: 52, readMbPerMin: null, writeMbPerMin: null },
    ]);
    expect(rows[1].readMbPerMin).toBeCloseTo(6, 5);
    expect(rows[1].writeMbPerMin).toBeCloseTo(2, 5);
  });

  it("détecte une série exploitable", () => {
    expect(
      hasBlockIoSeries([
        {
          timeMs: 0,
          readMb: 0,
          writeMb: 0,
          readMbPerMin: null,
          writeMbPerMin: null,
        },
      ]),
    ).toBe(false);
    expect(
      hasBlockIoSeries([
        {
          timeMs: 0,
          readMb: 10,
          writeMb: 0,
          readMbPerMin: null,
          writeMbPerMin: null,
        },
      ]),
    ).toBe(true);
  });
});
