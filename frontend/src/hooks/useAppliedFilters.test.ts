import { act, renderHook } from "@testing-library/react";
import { useAppliedFilters } from "./useAppliedFilters";

describe("useAppliedFilters", () => {
  it("sépare brouillon et filtres appliqués", () => {
    const { result } = renderHook(() =>
      useAppliedFilters({ category: "", query: "" }),
    );

    expect(result.current.hasDraftChanges).toBe(false);

    act(() => {
      result.current.updateDraft("category", "network");
    });

    expect(result.current.draft.category).toBe("network");
    expect(result.current.applied.category).toBe("");
    expect(result.current.hasDraftChanges).toBe(true);

    act(() => {
      result.current.apply();
    });

    expect(result.current.applied.category).toBe("network");
    expect(result.current.hasDraftChanges).toBe(false);
  });

  it("réinitialise brouillon et filtres appliqués", () => {
    const { result } = renderHook(() =>
      useAppliedFilters({ category: "auth", query: "lab" }),
    );

    act(() => {
      result.current.updateDraft("query", "network");
      result.current.apply();
      result.current.reset({ category: "", query: "" });
    });

    expect(result.current.applied).toEqual({ category: "", query: "" });
    expect(result.current.draft).toEqual({ category: "", query: "" });
  });
});
