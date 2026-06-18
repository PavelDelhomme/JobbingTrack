import {
  feedbackCategoryFromCrash,
  formatMemoryBytes,
  isUserFeedbackCrash,
} from "../mobileFeedback";
import type { CrashReportSummary } from "@/lib/services/applicationAnalyticsService";

describe("mobileFeedback", () => {
  it("isUserFeedbackCrash accepte metadata.feedback", () => {
    const crash: CrashReportSummary = {
      id: "1",
      timestamp: "2026-01-01T00:00:00Z",
      crashType: "ManualReport",
      message: "[bug] test",
      metadata: { metadata: { feedback: true, category: "bug" } },
    };
    expect(isUserFeedbackCrash(crash)).toBe(true);
    expect(feedbackCategoryFromCrash(crash)).toBe("bug");
  });

  it("isUserFeedbackCrash rejette les crash auto sans préfixe retour", () => {
    const crash: CrashReportSummary = {
      id: "2",
      timestamp: "2026-01-01T00:00:00Z",
      crashType: "FlutterError",
      message: "Exception: [some bracket] in stack",
      metadata: {},
    };
    expect(isUserFeedbackCrash(crash)).toBe(false);
  });

  it("formatMemoryBytes affiche en Mo", () => {
    expect(formatMemoryBytes(2 * 1024 * 1024)).toBe("2.0 Mo");
  });
});
