export type EventSourceFilter = "all" | "mobile" | "backoffice" | "api";

export interface AnalyticsEventLike {
  platform?: string | null;
  eventType?: string | null;
  eventName?: string | null;
  category?: string | null;
}

const MOBILE_PLATFORMS = new Set(["mobile", "android", "ios"]);

export function classifyEventSource(event: AnalyticsEventLike): EventSourceFilter {
  const platform = (event.platform || "").toLowerCase();
  const eventType = (event.eventType || "").toLowerCase();
  const eventName = (event.eventName || "").toLowerCase();
  const category = (event.category || "").toLowerCase();

  if (
    eventType === "api" ||
    eventType === "api_call" ||
    eventName.startsWith("api_") ||
    eventName.includes("api_error") ||
    category === "api"
  ) {
    return "api";
  }

  if (MOBILE_PLATFORMS.has(platform) || category === "mobile") {
    return "mobile";
  }

  if (platform === "web" || category === "backoffice" || category === "web") {
    return "backoffice";
  }

  return "backoffice";
}

export function eventSourceLabel(source: EventSourceFilter): string {
  switch (source) {
    case "mobile":
      return "Mobile";
    case "backoffice":
      return "Backoffice";
    case "api":
      return "API";
    default:
      return "Toutes sources";
  }
}

export function filterEventsBySource<T extends AnalyticsEventLike>(
  events: T[],
  source: EventSourceFilter,
  eventTypeFilter?: string,
): T[] {
  return events.filter((event) => {
    if (source !== "all" && classifyEventSource(event) !== source) {
      return false;
    }
    if (eventTypeFilter && eventTypeFilter !== "all") {
      return (event.eventType || "") === eventTypeFilter;
    }
    return true;
  });
}

export function uniqueEventTypes(events: AnalyticsEventLike[]): string[] {
  const types = new Set<string>();
  for (const e of events) {
    if (e.eventType) types.add(e.eventType);
  }
  return Array.from(types).sort();
}
