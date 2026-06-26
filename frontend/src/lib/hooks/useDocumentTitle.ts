"use client";

import { useEffect } from "react";
import { setDocumentTitleOverride } from "@/lib/documentTitleStore";

/** Surcharge le titre déduit de l’URL (pages dynamiques, détail entité, etc.). */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    setDocumentTitleOverride(title);
    return () => setDocumentTitleOverride(null);
  }, [title]);
}
