"use client";

import { useEffect, useMemo, useState } from "react";
import type { KanbanColumnId } from "@/lib/pilotage/validationBoardTypes";
import type { BoardActionPayload } from "@/components/pilotage/pilotageUi";

export const COLUMN_OPTIONS: { id: KanbanColumnId; label: string }[] = [
  { id: "backlog", label: "À faire" },
  { id: "doing", label: "▶ En cours" },
  { id: "a_tester", label: "À tester" },
  { id: "a_valider", label: "À valider" },
  { id: "rework", label: "À reprendre" },
  { id: "later", label: "Plus tard" },
  { id: "done", label: "Terminées" },
  { id: "inbox_feedback", label: "Inbox retours" },
  { id: "inbox_errors", label: "Inbox erreurs" },
];

/**
 * Déplacement de colonne : recherche + sélection (une carte = une colonne).
 */
export function ColumnMoveControl({
  taskId,
  currentColumn,
  canWrite,
  acting,
  onAction,
  compact,
}: {
  taskId: string;
  currentColumn?: KanbanColumnId | null;
  canWrite: boolean;
  acting: boolean;
  onAction: (payload: BoardActionPayload) => Promise<void>;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<KanbanColumnId | "">(
    currentColumn || "",
  );

  useEffect(() => {
    setPicked(currentColumn || "");
  }, [currentColumn, taskId]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit = COLUMN_OPTIONS.find(
      (c) =>
        c.label.toLowerCase() === q ||
        c.id.toLowerCase() === q ||
        c.label.toLowerCase().includes(q),
    );
    if (hit) setPicked(hit.id);
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COLUMN_OPTIONS;
    return COLUMN_OPTIONS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }, [query]);

  const apply = async () => {
    if (!picked || !canWrite) return;
    if (picked === currentColumn) return;
    await onAction({
      type: picked === "doing" ? "focus" : "setColumn",
      itemId: taskId,
      column: picked,
    });
  };

  if (compact) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <select
          className="max-w-full rounded border border-black/15 bg-white/90 px-1.5 py-0.5 text-[10px] text-gray-900 dark:border-white/20 dark:bg-gray-900 dark:text-gray-100"
          disabled={!canWrite || acting}
          value={currentColumn || ""}
          onChange={(e) => {
            const col = e.target.value as KanbanColumnId;
            if (!col) return;
            void onAction({
              type: col === "doing" ? "focus" : "setColumn",
              itemId: taskId,
              column: col,
            });
          }}
          aria-label="Colonne"
        >
          <option value="" disabled>
            Colonne…
          </option>
          {COLUMN_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Colonne actuelle :{" "}
        <strong>
          {COLUMN_OPTIONS.find((c) => c.id === currentColumn)?.label ||
            currentColumn ||
            "—"}
        </strong>
        {" · "}une carte ne peut être que dans <em>une</em> colonne.
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher une colonne (ex. tester, plus tard…)"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950"
        disabled={!canWrite}
        list={`col-suggest-${taskId}`}
      />
      <datalist id={`col-suggest-${taskId}`}>
        {COLUMN_OPTIONS.map((c) => (
          <option key={c.id} value={c.label} />
        ))}
      </datalist>
      <div className="flex flex-wrap gap-2">
        <select
          className="min-w-[12rem] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950"
          disabled={!canWrite || acting}
          value={picked}
          onChange={(e) => setPicked(e.target.value as KanbanColumnId | "")}
        >
          <option value="">Choisir…</option>
          {filtered.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!canWrite || acting || !picked || picked === currentColumn}
          onClick={() => void apply()}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Déplacer
        </button>
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Aucune colonne ne correspond à « {query} ».
        </p>
      ) : null}
    </div>
  );
}
