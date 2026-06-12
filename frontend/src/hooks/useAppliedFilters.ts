"use client";

import { useCallback, useMemo, useState } from "react";

function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  const keys = Object.keys(a) as Array<keyof T>;
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => a[key] === b[key]);
}

export function useAppliedFilters<T extends Record<string, unknown>>(
  initialValues: T,
) {
  const [applied, setApplied] = useState<T>(initialValues);
  const [draft, setDraft] = useState<T>(initialValues);

  const hasDraftChanges = useMemo(
    () => !shallowEqual(applied, draft),
    [applied, draft],
  );

  const updateDraft = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const apply = useCallback(() => {
    setApplied(draft);
  }, [draft]);

  const reset = useCallback(
    (nextValues: T = initialValues) => {
      setDraft(nextValues);
      setApplied(nextValues);
    },
    [initialValues],
  );

  return {
    applied,
    draft,
    setDraft,
    updateDraft,
    apply,
    reset,
    hasDraftChanges,
    setApplied,
  };
}
