"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Pagination synchronisée sur l’URL (?page=2) : survit au rafraîchissement auto et au F5.
 */
export function useUrlPagination(paramKey = "page", defaultPage = 1) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(paramKey);
  const parsed = raw ? parseInt(raw, 10) : defaultPage;
  const page = Number.isFinite(parsed) && parsed >= 1 ? parsed : defaultPage;

  const setPage = useCallback(
    (next: number) => {
      const valid = Math.max(1, Math.floor(next));
      const params = new URLSearchParams(searchParams.toString());
      if (valid === defaultPage) {
        params.delete(paramKey);
      } else {
        params.set(paramKey, String(valid));
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname, searchParams, paramKey, defaultPage],
  );

  return { page, setPage };
}
