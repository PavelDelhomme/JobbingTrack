"use client";

import { useState, useEffect } from "react";

/** Affiche le rapport HTML dans un iframe via Blob URL pour éviter les erreurs de parsing (srcdoc avec newlines/guillemets). */
export function ReportIframe({
  content,
  isFullscreen,
}: {
  content: string;
  isFullscreen: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!content) {
      setSrc(null);
      return;
    }
    const blob = new Blob([content], { type: "text/html; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [content]);
  if (!src)
    return <div className="p-4 text-gray-500">Chargement du rapport...</div>;
  return (
    <iframe
      src={src}
      className={`w-full border border-gray-200 dark:border-gray-700 rounded ${isFullscreen ? "h-full" : "h-[28rem] lg:h-full lg:min-h-0"}`}
      title="Rapport de test"
      style={{
        maxWidth: "100%",
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    />
  );
}
