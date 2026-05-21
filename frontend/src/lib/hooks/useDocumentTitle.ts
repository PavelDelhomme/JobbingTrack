"use client";

import { useEffect } from "react";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    if (!title.trim()) return;
    document.title = `${title} | JobbingTrack`;
  }, [title]);
}
