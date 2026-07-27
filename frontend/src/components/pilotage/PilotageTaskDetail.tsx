"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CycleView,
  DecisionStamp,
  ValidationTask,
} from "@/lib/pilotage/validationBoardTypes";
import {
  taskStatusClass,
  taskStatusLabel,
  type BoardActionPayload,
} from "@/components/pilotage/pilotageUi";

export function PilotageTaskDetail({
  task,
  cycle,
  canWrite,
  acting,
  onClose,
  onAction,
  embedded,
}: {
  task: ValidationTask;
  cycle?: CycleView | null;
  canWrite: boolean;
  acting: boolean;
  onClose?: () => void;
  onAction: (payload: BoardActionPayload) => Promise<void>;
  /** true = panneau desktop (pas de sheet chrome) */
  embedded?: boolean;
}) {
  const [note, setNote] = useState(task.porteurNote || "");
  useEffect(() => {
    setNote(task.porteurNote || "");
  }, [task.id, task.porteurNote]);

  const progress = useMemo(() => {
    const total = task.checklist.length;
    const done = task.checklist.filter((c) => c.done).length;
    return { done, total };
  }, [task.checklist]);

  const decide = (decision: DecisionStamp) =>
    onAction({ type: "decide", itemId: task.id, decision, note: note.trim() });

  const body = (
    <>
      <div className="space-y-1 border-b border-gray-200 pb-4 dark:border-gray-700">
        <p className="font-mono text-xs text-gray-500">{task.id}</p>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {task.label}
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${taskStatusClass(task.status)}`}
          >
            {taskStatusLabel(task.status)}
          </span>
          {cycle ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Cycle · {cycle.label} ({cycle.progressLabel})
            </span>
          ) : null}
          {progress.total > 0 ? (
            <span className="text-gray-500">
              Critères {progress.done}/{progress.total}
            </span>
          ) : null}
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Quoi tester
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {task.description || "—"}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Résultat attendu
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {task.expected || "—"}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Sous-critères
        </h3>
        {task.checklist.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun critère détaillé.</p>
        ) : (
          <ul className="space-y-2">
            {task.checklist.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-950/50"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={c.done}
                  disabled={!canWrite || acting}
                  onChange={() =>
                    void onAction({
                      type: "checklist",
                      itemId: task.id,
                      checklistItemId: c.id,
                      done: !c.done,
                    })
                  }
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${c.done ? "text-gray-500 line-through" : "text-gray-900 dark:text-gray-100"}`}
                  >
                    {c.label}
                  </p>
                  {c.note ? (
                    <p className="mt-0.5 text-xs text-gray-500">{c.note}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Ce que j&apos;ai constaté
        </h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={!canWrite}
          rows={3}
          placeholder="Notes porteur (ce qui marche / bloque…)"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950"
        />
        <button
          type="button"
          disabled={!canWrite || acting}
          onClick={() =>
            void onAction({
              type: "note",
              itemId: task.id,
              note: note.trim(),
            })
          }
          className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm dark:bg-gray-800 disabled:opacity-40"
        >
          Enregistrer la note
        </button>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Décision
        </h3>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["OK", "bg-green-600"],
              ["PARTIEL", "bg-amber-600"],
              ["KO", "bg-red-600"],
              ["REWORK", "bg-orange-700"],
              ["PLUS_TARD", "bg-slate-600"],
            ] as const
          ).map(([d, cls]) => (
            <button
              key={d}
              type="button"
              disabled={!canWrite || acting}
              onClick={() => void decide(d)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 ${cls}`}
            >
              {d === "PLUS_TARD" ? "Plus tard" : d === "REWORK" ? "À reprendre" : d}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={!canWrite || acting}
            onClick={() =>
              void onAction({
                type: "reorder",
                itemId: task.id,
                direction: "up",
              })
            }
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 disabled:opacity-40"
          >
            ▲ Monter
          </button>
          <button
            type="button"
            disabled={!canWrite || acting}
            onClick={() =>
              void onAction({
                type: "reorder",
                itemId: task.id,
                direction: "down",
              })
            }
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 disabled:opacity-40"
          >
            ▼ Descendre
          </button>
          <button
            type="button"
            disabled={!canWrite || acting}
            onClick={() =>
              void onAction({
                type: "move",
                itemId: task.id,
                decision: "PLUS_TARD",
                note: note.trim() || undefined,
              })
            }
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 disabled:opacity-40"
          >
            Reporter (plus tard)
          </button>
        </div>
      </section>

      {task.history?.length ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Historique
          </h3>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-gray-600 dark:text-gray-400">
            {task.history.slice(0, 12).map((h, i) => (
              <li key={`${h.at}-${i}`}>
                <span className="font-mono">
                  {new Date(h.at).toLocaleString("fr-FR")}
                </span>{" "}
                · {h.action}
                {h.note ? ` — ${h.note}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );

  if (embedded) {
    return <div className="space-y-5 p-4 sm:p-5">{body}</div>;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700 sm:px-5">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Détail tâche
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Fermer
          </button>
        </div>
        <div className="space-y-5 overflow-y-auto p-4 sm:p-5">{body}</div>
      </div>
    </div>
  );
}
