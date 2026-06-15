import {
  defaultChartBrushWindow,
  useSyncedChartBrushRange,
} from "./useSyncedChartBrushRange";
import { renderHook, act } from "@testing-library/react";

describe("useSyncedChartBrushRange", () => {
  it("démarre sur la fenêtre récente par défaut", () => {
    expect(defaultChartBrushWindow(200, 80)).toEqual({
      startIndex: 120,
      endIndex: 199,
    });
  });

  it("partage start/end entre graphes et borne au changement de longueur", () => {
    const { result, rerender } = renderHook(
      ({ len }) => useSyncedChartBrushRange(len, 40),
      { initialProps: { len: 100 } },
    );

    expect(result.current.brushStart).toBe(60);
    expect(result.current.brushEnd).toBe(99);

    act(() => {
      result.current.onBrushChange({ startIndex: 10, endIndex: 30 });
    });
    expect(result.current.brushStart).toBe(10);
    expect(result.current.brushEnd).toBe(30);
    expect(result.current.hasCustomBrush).toBe(true);

    rerender({ len: 20 });
    expect(result.current.brushEnd).toBe(19);
    expect(result.current.brushStart).toBe(10);

    act(() => {
      result.current.resetBrush();
    });
    expect(result.current.hasCustomBrush).toBe(false);
    expect(result.current.brushStart).toBe(0);
    expect(result.current.brushEnd).toBe(19);
  });
});
