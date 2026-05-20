"use client";

import { PageLoader, type PageLoaderProps } from "./PageLoader";

/** Chargeur dans une page déjà sous AdminLayout (pas plein écran navigateur). */
export function SectionLoader({
  message = "Chargement…",
  className = "min-h-[40vh]",
}: Omit<PageLoaderProps, "fullScreen">) {
  return (
    <PageLoader message={message} fullScreen={false} className={className} />
  );
}
