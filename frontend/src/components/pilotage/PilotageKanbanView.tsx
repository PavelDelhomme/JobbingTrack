"use client";

import { useEffect, useMemo, useState } from "react";
import type { PilotageBoard } from "@/lib/pilotage/board";
import {
  buildKanbanColumns,
  type FeedbackInboxItem,
} from "@/lib/pilotage/kanbanBoard";
import type { KanbanColumnId } from "@/lib/pilotage/validationBoardTypes";
import {
  taskStatusClass,
  taskStatusLabel,
  type BoardActionPayload,
} from "@/components/pilotage/pilotageUi";
import { PilotageTaskDetail } from "@/components/pilotage/PilotageTaskDetail";
import { fetchCrashReports } from "@/lib/services/applicationAnalyticsService";
import {
  isMonitoringTestOrSmokeCrash,
  isUserFeedbackCrash,
} from "@/lib/analytics/mobileFeedback";

const MOVE_TARGETS: { id: KanbanColumnId; label: string }[] = [
  { id: "backlog", label: "→ À faire" },
  { id: "doing", label: "→ En cours" },
  { id: "a_tester", label: "→ À tester" },
  { id: "a_valider", label: "→ À valider" },
  { id: "rework", label: "→ Rework" },
  { id: "later", label: "→ Plus tard" },
  { id: "done", label: "→ Terminé" },
];

export function PilotageKanbanView({
  board,
  canWrite,
  loading,
  token,
  onRefresh,
  onAction,
}: {
  board: PilotageBoard;
  canWrite: boolean;
  loading: boolean;
  token?: string | null;
  onRefresh: () => void;
  onAction: (payload: BoardActionPayload) => Promise<void>;
}) {
  const [inbox, setInbox] = useState<FeedbackInboxItem[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [showQuiet, setShowQuiet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!token) return;
    (async () => {
      try {
        const crashes = await fetchCrashReports(token, 80);
        if (cancelled) return;
        const items: FeedbackInboxItem[] = [];
        for (const c of crashes) {
          if (isMonitoringTestOrSmokeCrash(c)) continue;
          const id = `crash-${c.id}`;
          if (isUserFeedbackCrash(c)) {
            items.push({
              id,
              kind: "feedback",
              label: (c.message || "Retour utilisateur").slice(0, 120),
              description: `${c.crashType || "ManualReport"} · ${c.timestamp || ""}`,
              at: c.timestamp,
              sourceRef: String(c.id),
            });
          } else {
            items.push({
              id,
              kind: "error",
              label: (c.message || "Crash auto").slice(0, 120),
              description: `${c.crashType || "crash"} · ${c.timestamp || ""}`,
              at: c.timestamp,
              sourceRef: String(c.id),
            });
          }
        }
        setInbox(items.slice(0, 40));
      } catch {
        /* inbox optionnelle */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [board.updatedAt, token]);

  const { columns, focus } = useMemo(
    () => buildKanbanColumns(board.validation, inbox),
    [board.validation, inbox],
  );

  const selected = selectedId
    ? board.validation.tasks[selectedId] ?? null
    : null;
  const selectedCycle = selected?.cycleId
    ? board.cycles.find((c) => c.id === selected.cycleId) ?? null
    : null;

  useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const c of columns) {
      if (c.collapsedByDefault && collapsed[c.id] === undefined) {
        init[c.id] = true;
      }
    }
    if (Object.keys(init).length) {
      setCollapsed((s) => ({ ...init, ...s }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per column defs
  }, [columns.map((c) => c.id).join(",")]);

  const run = async (payload: BoardActionPayload) => {
    setActing(true);
    try {
      await onAction(payload);
    } finally {
      setActing(false);
    }
  };

  const visibleColumns = columns.filter((c) => {
    if (showQuiet) return true;
    if (
      c.id === "inbox_feedback" ||
      c.id === "inbox_errors" ||
      c.id === "later" ||
      c.id === "done"
    ) {
      return c.cards.length > 0 || !c.collapsedByDefault;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <section className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">
              Focus TDAH — une seule chose
            </p>
            {focus ? (
              <>
                <p className="mt-1 font-mono text-xs text-amber-800 dark:text-amber-300">
                  {focus.id}
                </p>
                <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-gray-50">
                  {focus.label}
                </p>
                <p className="mt-1 max-w-2xl text-sm text-gray-700 dark:text-gray-300">
                  {focus.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canWrite || acting}
                    onClick={() => setSelectedId(focus.id)}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    Ouvrir la fiche
                  </button>
                  {canWrite ? (
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() =>
                        run({
                          type: "setColumn",
                          itemId: focus.id,
                          column: "a_tester",
                        })
                      }
                      className="rounded-lg border border-amber-700 px-3 py-1.5 text-sm text-amber-950 dark:text-amber-100"
                    >
                      → À tester
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Rien en cours. Choisis <strong>une</strong> carte dans « À faire »
                → bouton <strong>En cours</strong>.
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg bg-white/90 px-3 py-1.5 text-sm text-gray-900 dark:bg-gray-900 dark:text-gray-100"
            >
              {loading ? "…" : "Rafraîchir"}
            </button>
            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showQuiet}
                onChange={(e) => setShowQuiet(e.target.checked)}
              />
              Afficher colonnes calmes (inbox / plus tard / done vides)
            </label>
          </div>
        </div>
        <p className="mt-3 text-xs text-amber-950 dark:text-amber-100">
          {board.where} · WIP En cours = 1 · Les autres cartes restent en À faire /
          À tester / À valider — pas « en cours ».
        </p>
      </section>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {visibleColumns.map((col) => {
          const isCollapsed = !!collapsed[col.id];
          return (
            <section
              key={col.id}
              className={`flex w-72 shrink-0 flex-col rounded-xl border ${col.tone} ${
                col.overWip ? "ring-2 ring-red-500" : ""
              }`}
            >
              <button
                type="button"
                onClick={() =>
                  setCollapsed((s) => ({ ...s, [col.id]: !s[col.id] }))
                }
                className={`flex items-start justify-between gap-2 px-3 py-2 text-left ${col.headerClass}`}
              >
                <div>
                  <p className={`text-sm font-bold ${col.headerClass}`}>
                    {col.short}
                    <span className="ml-1 font-normal opacity-70">
                      ({col.cards.length}
                      {col.wip != null ? `/${col.wip}` : ""})
                    </span>
                  </p>
                  <p className={`text-[11px] leading-snug opacity-80 ${col.headerClass}`}>
                    {col.hint}
                  </p>
                </div>
                <span className="opacity-60">{isCollapsed ? "▸" : "▾"}</span>
              </button>
              {!isCollapsed ? (
                <ul className="max-h-[70vh] space-y-2 overflow-y-auto px-2 pb-3">
                  {col.cards.length === 0 ? (
                    <li
                      className={`px-2 py-4 text-center text-xs opacity-60 ${col.headerClass}`}
                    >
                      Vide
                    </li>
                  ) : (
                    col.cards.map((card) => {
                      const isBoardTask = !!board.validation.tasks[card.id];
                      const pad = Math.min(card.depth, 3) * 8;
                      return (
                        <li
                          key={card.id}
                          className={`rounded-lg border p-2 shadow-sm ${col.cardClass} ${
                            selectedId === card.id ? "ring-2 ring-indigo-500" : ""
                          }`}
                          style={{ marginLeft: pad }}
                        >
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => {
                              if (isBoardTask) setSelectedId(card.id);
                            }}
                          >
                            <p className="font-mono text-[10px] opacity-70">
                              {card.kind === "feedback"
                                ? "retour"
                                : card.kind === "error"
                                  ? "erreur"
                                  : card.id}
                            </p>
                            <p className="text-sm font-semibold">
                              {card.label}
                            </p>
                            {card.kind === "task" || card.kind === "block" ? (
                              <span
                                className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${taskStatusClass(card.status)}`}
                              >
                                {taskStatusLabel(card.status)}
                              </span>
                            ) : null}
                          </button>
                          {canWrite && isBoardTask ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {col.id !== "doing" ? (
                                <button
                                  type="button"
                                  disabled={acting}
                                  className="rounded bg-amber-700 px-1.5 py-0.5 text-[10px] font-bold text-white"
                                  onClick={() =>
                                    run({ type: "focus", itemId: card.id })
                                  }
                                >
                                  En cours
                                </button>
                              ) : null}
                              {MOVE_TARGETS.filter((t) => t.id !== col.id)
                                .slice(0, 4)
                                .map((t) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    disabled={acting}
                                    className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-medium dark:bg-white/15"
                                    onClick={() =>
                                      run({
                                        type: "setColumn",
                                        itemId: card.id,
                                        column: t.id,
                                      })
                                    }
                                  >
                                    {t.label}
                                  </button>
                                ))}
                            </div>
                          ) : null}
                          {canWrite && !isBoardTask ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              <button
                                type="button"
                                disabled={acting}
                                className="rounded bg-violet-700 px-1.5 py-0.5 text-[10px] font-bold text-white"
                                onClick={() =>
                                  run({
                                    type: "promoteInbox",
                                    itemId: card.id,
                                    label: card.label,
                                    description: card.description,
                                    inboxKind:
                                      card.kind === "error"
                                        ? "error"
                                        : "feedback",
                                    sourceRef: card.sourceRef,
                                    column: "backlog",
                                  })
                                }
                              >
                                → Carte board
                              </button>
                              <button
                                type="button"
                                disabled={acting}
                                className="rounded bg-amber-700 px-1.5 py-0.5 text-[10px] font-bold text-white"
                                onClick={() =>
                                  run({
                                    type: "promoteInbox",
                                    itemId: card.id,
                                    label: card.label,
                                    description: card.description,
                                    inboxKind:
                                      card.kind === "error"
                                        ? "error"
                                        : "feedback",
                                    sourceRef: card.sourceRef,
                                    column: "doing",
                                  })
                                }
                              >
                                → En cours
                              </button>
                            </div>
                          ) : null}
                        </li>
                      );
                    })
                  )}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>

      {selected ? (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 lg:max-w-xl">
          <PilotageTaskDetail
            task={selected}
            cycle={selectedCycle}
            canWrite={canWrite}
            acting={acting}
            onClose={() => setSelectedId(null)}
            onAction={run}
            embedded
          />
        </div>
      ) : null}
    </div>
  );
}
