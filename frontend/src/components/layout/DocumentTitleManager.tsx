"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getDocumentTitleOverride,
  subscribeDocumentTitleOverride,
} from "@/lib/documentTitleStore";
import { formatDocumentTitle, resolvePageTitle } from "@/lib/pageTitles";

export function DocumentTitleManager() {
  const pathname = usePathname() || "/";
  const [override, setOverride] = useState<string | null>(() =>
    getDocumentTitleOverride(),
  );

  useEffect(() => subscribeDocumentTitleOverride(() => {
    setOverride(getDocumentTitleOverride());
  }), []);

  useEffect(() => {
    const title = override || resolvePageTitle(pathname);
    document.title = formatDocumentTitle(title);
  }, [pathname, override]);

  return null;
}
