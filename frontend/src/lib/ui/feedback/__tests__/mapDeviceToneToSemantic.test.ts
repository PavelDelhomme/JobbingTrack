import { mapDeviceToneToSemantic } from "@/lib/ui/feedback/types";

describe("mapDeviceToneToSemantic", () => {
  it("mappe amber et warning vers warning", () => {
    expect(mapDeviceToneToSemantic("amber")).toBe("warning");
    expect(mapDeviceToneToSemantic("warning")).toBe("warning");
  });

  it("mappe ok vers success", () => {
    expect(mapDeviceToneToSemantic("ok")).toBe("success");
  });
});
