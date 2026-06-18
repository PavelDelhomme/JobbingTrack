import {
  classifyEventSource,
  filterEventsBySource,
  uniqueEventTypes,
} from "../eventSource";

describe("eventSource", () => {
  it("classifie mobile vs backoffice vs api", () => {
    expect(
      classifyEventSource({
        platform: "android",
        eventType: "navigation",
        category: "mobile",
      }),
    ).toBe("mobile");
    expect(
      classifyEventSource({
        platform: "web",
        eventType: "click",
        category: "web",
      }),
    ).toBe("backoffice");
    expect(
      classifyEventSource({
        platform: "android",
        eventType: "api",
        eventName: "api_error",
      }),
    ).toBe("api");
  });

  it("filtre par source et type", () => {
    const events = [
      { id: "1", platform: "android", eventType: "navigation", eventName: "screen_view" },
      { id: "2", platform: "web", eventType: "click", eventName: "btn" },
      { id: "3", platform: "android", eventType: "api", eventName: "api_error" },
    ];
    expect(filterEventsBySource(events, "mobile").map((e) => e.id)).toEqual(["1"]);
    expect(filterEventsBySource(events, "api").map((e) => e.id)).toEqual(["3"]);
    expect(
      filterEventsBySource(events, "all", "navigation").map((e) => e.id),
    ).toEqual(["1"]);
  });

  it("liste les types uniques", () => {
    expect(
      uniqueEventTypes([
        { eventType: "trace" },
        { eventType: "navigation" },
        { eventType: "navigation" },
      ]),
    ).toEqual(["navigation", "trace"]);
  });
});
