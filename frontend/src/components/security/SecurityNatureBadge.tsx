import {
  classifySecurityEventNature,
  formatBlockOriginLabelOrUnknown,
  formatSecurityEventNatureLabel,
  type SecurityEventNature,
} from "@/lib/security/securityLabels";

type SecurityNatureBadgeProps = {
  eventType?: string | null;
  blockOrigin?: string | null;
  nature?: SecurityEventNature;
  showOrigin?: boolean;
};

const NATURE_CLASS: Record<SecurityEventNature, string> = {
  detection:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100",
  manual_block:
    "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-100",
  auto_block: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-100",
  policy_change: "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100",
  auth: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100",
  other: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
};

export function SecurityNatureBadge({
  eventType,
  blockOrigin,
  nature,
  showOrigin = false,
}: SecurityNatureBadgeProps) {
  const resolvedNature =
    nature || (eventType ? classifySecurityEventNature(eventType) : "other");
  const label = formatSecurityEventNatureLabel(eventType);

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={`rounded px-2 py-0.5 text-xs font-medium ${NATURE_CLASS[resolvedNature]}`}
      >
        {label}
      </span>
      {showOrigin ? (
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {formatBlockOriginLabelOrUnknown(blockOrigin)}
        </span>
      ) : null}
    </span>
  );
}
