import {
  appDataSampleRangeLabel,
  buildAppDataChartRows,
  normalizeStatisticsTimelineResponse,
  periodDaysToTimeRange,
} from "../appDataTimeline";

describe("appDataTimeline", () => {
  it("conserve la note fallback et les métadonnées de timeline", () => {
    const result = normalizeStatisticsTimelineResponse({
      success: true,
      time_range: "7d",
      limit: "500",
      note: "Timeline simplifiée (fallback).",
      timeline: [
        {
          timestamp: "2026-06-15T10:17:00.600Z",
          total_users: 146,
          active_users: 1,
          total_applications: 1043,
          total_companies: 761,
          total_contacts: 2,
          total_interviews: 128,
          new_this_week: 2,
          new_this_month: 2,
          applications_by_status: {},
          users_by_role: {},
          companies_by_industry: {},
        },
      ],
    });

    expect(result.note).toBe("Timeline simplifiée (fallback).");
    expect(result.timeRange).toBe("7d");
    expect(result.limit).toBe(500);
    expect(result.timeline).toHaveLength(1);
  });

  it("retourne une timeline vide pour un payload invalide", () => {
    expect(normalizeStatisticsTimelineResponse(null)).toEqual({
      timeline: [],
      note: null,
      timeRange: null,
      limit: null,
    });
  });

  it("convertit la période en paramètre API time_range", () => {
    expect(periodDaysToTimeRange(1)).toBe("24h");
    expect(periodDaysToTimeRange(7)).toBe("7d");
    expect(periodDaysToTimeRange(30)).toBe("30d");
  });

  it("formate une plage d’échantillon timeline", () => {
    const base = Date.parse("2026-06-17T12:00:00.000Z");
    const rows = buildAppDataChartRows([
      {
        timestamp: new Date(base).toISOString(),
        total_applications: 1,
        total_users: 1,
        total_companies: 1,
        total_contacts: 1,
        total_interviews: 1,
      },
      {
        timestamp: new Date(base + 3600_000).toISOString(),
        total_applications: 2,
        total_users: 2,
        total_companies: 2,
        total_contacts: 2,
        total_interviews: 2,
      },
    ]);
    const label = appDataSampleRangeLabel(rows, 7);
    expect(label).toMatch(/→/);
  });
});
