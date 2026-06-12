import type { CSSProperties } from "react";

/** Fond / bordure / texte alignés sur les tokens shadcn (`globals.css`) — lisibles en clair et en sombre. */
export const rechartsTooltipContentStyle: CSSProperties = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--popover-foreground))",
  boxShadow:
    "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.06)",
};

export const rechartsTooltipLabelStyle: CSSProperties = {
  color: "hsl(var(--foreground))",
  fontWeight: 600,
  marginBottom: 4,
};

/** Props par défaut pour `<Tooltip>` Recharts (évite texte blanc sur fond blanc en `dark`). */
export const rechartsTooltipProps = {
  contentStyle: rechartsTooltipContentStyle,
  labelStyle: rechartsTooltipLabelStyle,
} as const;
