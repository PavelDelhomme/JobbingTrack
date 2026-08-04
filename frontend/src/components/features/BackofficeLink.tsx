"use client";

import Link from "next/link";
import {
  type ComponentProps,
  type MouseEvent,
  useCallback,
} from "react";

type BackofficeLinkProps = ComponentProps<typeof Link>;

function hrefToUrl(href: BackofficeLinkProps["href"]): string {
  if (typeof href === "string") return href;
  if (href == null) return "/";
  try {
    // UrlObject Next — reconstruire un chemin absolu relatif au site
    const path = href.pathname ?? "/";
    let search = "";
    if (typeof href.search === "string" && href.search) {
      search = href.search.startsWith("?") ? href.search : `?${href.search}`;
    } else if (href.query && typeof href.query === "object") {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(href.query)) {
        if (value == null) continue;
        if (Array.isArray(value)) {
          for (const item of value) params.append(key, String(item));
        } else {
          params.set(key, String(value));
        }
      }
      const q = params.toString();
      if (q) search = `?${q}`;
    }
    const hash =
      typeof href.hash === "string" && href.hash
        ? href.hash.startsWith("#")
          ? href.hash
          : `#${href.hash}`
        : "";
    return `${path}${search}${hash}`;
  } catch {
    return "/";
  }
}

function shouldOpenInNewTab(e: MouseEvent): boolean {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1;
}

/**
 * Link backoffice : Ctrl/Cmd/molette ouvre un vrai nouvel onglet navigateur
 * sans soft-navigation Next sur l’onglet source (évite le faux « rechargement »).
 */
export function BackofficeLink({
  href,
  onClick,
  onAuxClick,
  prefetch = false,
  ...props
}: BackofficeLinkProps) {
  const openNewTab = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(hrefToUrl(href), "_blank", "noopener,noreferrer");
    },
    [href],
  );

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (shouldOpenInNewTab(e)) openNewTab(e);
      }}
      onAuxClick={(e) => {
        onAuxClick?.(e);
        if (e.defaultPrevented) return;
        if (e.button === 1) openNewTab(e);
      }}
      {...props}
    />
  );
}
