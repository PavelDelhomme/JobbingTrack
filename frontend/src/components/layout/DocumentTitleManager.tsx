"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getDocumentTitleOverride,
  subscribeDocumentTitleOverride,
} from "@/lib/documentTitleStore";
import { formatDocumentTitle, resolvePageTitle } from "@/lib/pageTitles";

/** Réapplique le titre si Next.js metadata l’écrase après hydratation / fin de chargement. */
export function DocumentTitleManager() {
  const pathname = usePathname() || "/";
  const [override, setOverride] = useState<string | null>(() =>
    getDocumentTitleOverride(),
  );
  const desiredTitleRef = useRef("JobbingTrack");

  useEffect(() => subscribeDocumentTitleOverride(() => {
    setOverride(getDocumentTitleOverride());
  }), []);

  useEffect(() => {
    const rawTitle = override || resolvePageTitle(pathname);
    const formatted = formatDocumentTitle(rawTitle);
    desiredTitleRef.current = formatted;

    const apply = () => {
      if (document.title !== formatted) {
        document.title = formatted;
      }
    };

    apply();

    const titleEl = document.querySelector("title");
    const observer = titleEl
      ? new MutationObserver(() => {
          if (document.title !== desiredTitleRef.current) {
            document.title = desiredTitleRef.current;
          }
        })
      : null;

    if (titleEl && observer) {
      observer.observe(titleEl, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    const raf = requestAnimationFrame(apply);
    const timers = [0, 50, 150, 400, 800].map((ms) =>
      window.setTimeout(apply, ms),
    );

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
      observer?.disconnect();
    };
  }, [pathname, override]);

  return null;
}
