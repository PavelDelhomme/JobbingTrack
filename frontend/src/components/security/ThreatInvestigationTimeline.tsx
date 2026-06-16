import Link from "next/link";
import { formatLocalDateTime } from "@/lib/utils/date";
import {
  formatSecurityEventTypeLabel,
  formatSecuritySeverity,
} from "@/lib/security/securityLabels";
import {
  formatTimelineSourceLabel,
  type ThreatTimelineItem,
} from "@/lib/security/threatInvestigationTimeline";

type ThreatInvestigationTimelineProps = {
  items: ThreatTimelineItem[];
  maxItems?: number;
};

function sourceBadgeClass(source: ThreatTimelineItem["source"]): string {
  switch (source) {
    case "threat":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
    case "security_log":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
    case "intrusion_attempt":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200";
    case "ddos_attack":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
}

function formatTimelineTitle(item: ThreatTimelineItem): string {
  if (item.source === "security_log") {
    return formatSecurityEventTypeLabel(item.title);
  }
  if (item.source === "threat" && item.title.startsWith("Menace détectée :")) {
    return item.title;
  }
  return item.title;
}

export function ThreatInvestigationTimeline({
  items,
  maxItems = 30,
}: ThreatInvestigationTimelineProps) {
  const visible = items.slice(0, maxItems);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Aucun événement corrélé sur les dernières 24 h — consulte les logs ou
        attends la prochaine collecte.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2 space-y-4">
      {visible.map((item) => (
        <li key={item.id} className="ml-4">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-800 bg-blue-500" />
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900/40">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${sourceBadgeClass(item.source)}`}
              >
                {formatTimelineSourceLabel(item.source)}
              </span>
              {item.severity && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatSecuritySeverity(item.severity)}
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                {formatLocalDateTime(item.timestamp)}
              </span>
            </div>
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              {formatTimelineTitle(item)}
            </p>
            {item.detail && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {item.detail}
              </p>
            )}
            {(item.endpoint ||
              item.method ||
              item.requestId ||
              item.userId) && (
              <p className="mt-2 font-mono text-xs text-gray-500 dark:text-gray-400 break-all">
                {[item.method, item.endpoint].filter(Boolean).join(" ")}
                {item.requestId ? ` · requestId ${item.requestId}` : ""}
                {item.userId ? ` · user ${item.userId}` : ""}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              {item.isBlocked && (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  Bloqué
                </span>
              )}
              {item.href && (
                <Link
                  href={item.href}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Voir le log
                </Link>
              )}
            </div>
            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-gray-500 dark:text-gray-400">
                  Métadonnées
                </summary>
                <pre className="mt-1 bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto font-mono text-[11px]">
                  {JSON.stringify(item.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </li>
      ))}
      {items.length > maxItems && (
        <li className="ml-4 text-xs text-gray-500 dark:text-gray-400">
          {items.length - maxItems} événement(s) supplémentaire(s) non
          affiché(s).
        </li>
      )}
    </ol>
  );
}
