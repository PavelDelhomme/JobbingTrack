import { normalizeStatisticsTimelineResponse } from "../appDataTimeline";

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
});
