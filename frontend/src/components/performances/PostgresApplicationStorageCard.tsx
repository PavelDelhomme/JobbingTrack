"use client";

import { useEffect, useState } from "react";
import { analyticsService } from "@/lib/api/analytics.service";
import { PerformanceChartCard } from "@/components/performances";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} Go`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${bytes} o`;
}

type TableRow = { table: string; bytes: number };

export function PostgresApplicationStorageCard() {
  const [loading, setLoading] = useState(true);
  const [dbBytes, setDbBytes] = useState<number | null>(null);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await analyticsService.getPersistenceStats();
        if (cancelled) return;
        const data = res?.data ?? res;
        setDbBytes(
          typeof data?.postgresDatabaseBytes === "number"
            ? data.postgresDatabaseBytes
            : null,
        );
        setTables(
          Array.isArray(data?.postgresApplicationTables)
            ? data.postgresApplicationTables
            : [],
        );
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Chargement impossible");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PerformanceChartCard
      title="Stockage Postgres (tables applicatives)"
      description="Taille disque des principales tables (emails, analytics mobile, logs). Les contenus email compressés (gz) réduisent la croissance."
    >
      {loading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : error ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Base courante :{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatBytes(dbBytes ?? 0)}
            </span>
          </p>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Table</th>
                  <th className="px-3 py-2 text-left font-medium">Taille</th>
                </tr>
              </thead>
              <tbody>
                {tables.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-gray-500">
                      Aucune statistique table disponible.
                    </td>
                  </tr>
                ) : (
                  tables.map((row) => (
                    <tr
                      key={row.table}
                      className="border-t border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-3 py-2 font-mono text-xs">{row.table}</td>
                      <td className="px-3 py-2">{formatBytes(row.bytes)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PerformanceChartCard>
  );
}
