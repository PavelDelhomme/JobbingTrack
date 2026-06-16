import { useCallback, useEffect, useState } from "react";

export type ChartBrushIndexRange = {
  startIndex: number;
  endIndex: number;
};

export function defaultChartBrushWindow(
  dataLength: number,
  visiblePoints = 80,
): ChartBrushIndexRange {
  if (dataLength <= 0) return { startIndex: 0, endIndex: 0 };
  const span = Math.min(dataLength, Math.max(1, visiblePoints));
  return {
    startIndex: Math.max(0, dataLength - span),
    endIndex: dataLength - 1,
  };
}

function clampBrushRange(
  range: ChartBrushIndexRange,
  dataLength: number,
): ChartBrushIndexRange {
  if (dataLength <= 0) return { startIndex: 0, endIndex: 0 };
  const startIndex = Math.max(0, Math.min(range.startIndex, dataLength - 1));
  const endIndex = Math.max(
    startIndex,
    Math.min(range.endIndex, dataLength - 1),
  );
  return { startIndex, endIndex };
}

/** Plage brush partagée entre plusieurs graphes Recharts indexés sur la même série temporelle. */
export function useSyncedChartBrushRange(
  dataLength: number,
  visiblePoints = 80,
) {
  const [brushRange, setBrushRange] = useState<ChartBrushIndexRange | null>(
    null,
  );

  const { startIndex: brushStart, endIndex: brushEnd } = brushRange
    ? clampBrushRange(brushRange, dataLength)
    : defaultChartBrushWindow(dataLength, visiblePoints);

  useEffect(() => {
    setBrushRange((prev) => {
      if (!prev || dataLength === 0) return null;
      const next = clampBrushRange(prev, dataLength);
      if (
        next.startIndex === prev.startIndex &&
        next.endIndex === prev.endIndex
      ) {
        return prev;
      }
      return next;
    });
  }, [dataLength]);

  const onBrushChange = useCallback(
    (range: { startIndex?: number; endIndex?: number }) => {
      if (dataLength === 0) return;
      const startIndex = Math.max(
        0,
        Math.min(range.startIndex ?? 0, dataLength - 1),
      );
      const endIndex = Math.max(
        startIndex,
        Math.min(range.endIndex ?? dataLength - 1, dataLength - 1),
      );
      setBrushRange({ startIndex, endIndex });
    },
    [dataLength],
  );

  const resetBrush = useCallback(() => setBrushRange(null), []);

  return {
    brushStart,
    brushEnd,
    onBrushChange,
    resetBrush,
    hasCustomBrush: brushRange != null,
  };
}
