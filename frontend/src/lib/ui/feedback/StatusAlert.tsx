import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SemanticTone } from "./types";

export type StatusAlertProps = {
  tone?: SemanticTone;
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Alerte sémantique — contraste garanti clair/sombre via `semantic-feedback.css`.
 * Préférer ce composant aux combinaisons Tailwind `bg-*-100` + `text-*` dans le backoffice.
 */
export function StatusAlert({
  tone = "neutral",
  title,
  children,
  footer,
  className,
}: StatusAlertProps) {
  return (
    <div
      role="alert"
      data-jt-tone={tone}
      className={cn("jt-status-alert", className)}
    >
      <p className="jt-status-alert__title">{title}</p>
      {children ? <div className="jt-status-alert__body">{children}</div> : null}
      {footer ? <div className="jt-status-alert__footer">{footer}</div> : null}
    </div>
  );
}
