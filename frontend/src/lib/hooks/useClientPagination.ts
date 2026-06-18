"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export function useClientPagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const slice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalItems);

  const goToPage = useCallback(
    (p: number) => setPage(Math.min(Math.max(1, p), totalPages)),
    [totalPages],
  );

  return {
    page,
    pageSize,
    totalPages,
    totalItems,
    slice,
    startIndex,
    endIndex,
    goToPage,
    goNext: () => goToPage(page + 1),
    goPrevious: () => goToPage(page - 1),
    canGoNext: page < totalPages,
    canGoPrevious: page > 1,
    resetPage: () => setPage(1),
  };
}
