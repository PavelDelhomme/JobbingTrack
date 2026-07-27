"use client";

import { useEffect, useMemo, useState } from "react";
import type { PilotageBoard } from "@/lib/pilotage/board";
import {
  buildKanbanColumns,
  type FeedbackInboxItem,
} from "@/lib/pilotage/kanbanBoard";
import {
  taskStatusClass,
  taskStatusLabel,
  type BoardActionPayload,
} from "@/components/pilotage/pilotageUi";
import { PilotageTaskDetail } from "@/components/pilotage/PilotageTaskDetail";
import { ColumnMoveControl } from "@/components/pilotage/ColumnMoveControl";
import { fetchCrashReports } from "@/lib/services/applicationAnalyticsService";
import {
  isMonitoringTestOrSmokeCrash,
  isUserFeedbackCrash,
} from "@/lib/analytics/mobileFeedback";
import { jtKanban, uiChip } from "@/lib/ui/kanban";
import { uiSurfaces, uiText } from "@/lib/ui/surfaces";
import { cn } from "@/lib/utils";

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
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

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

  // Ouvre le focus En cours à droite au chargement (desktop)
  useEffect(() => {
    if (focus?.id && !selectedId && isDesktop) {
      setSelectedId(focus.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on focus/desktop ready
  }, [focus?.id, isDesktop]);

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

  const openCard = (id: string) => setSelectedId(id);

  return (
    <div className="space-y-4">
      <section className={jtKanban.focus}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={jtKanban.focusEyebrow}>Focus TDAH — une seule chose</p>
            {focus ? (
              <>
                <p className={jtKanban.focusId}>{focus.id}</p>
                <p className={jtKanban.focusTitle}>{focus.label}</p>
                <p className={jtKanban.focusBody}>{focus.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canWrite || acting}
                    onClick={() => openCard(focus.id)}
                    className={uiChip.solid}
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
                      className={uiChip.ghost}
                    >
                      → À tester
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className={jtKanban.focusBody}>
                Rien en cours. Choisis <strong>une</strong> carte dans « À faire »
                → bouton <strong>En cours</strong> (ou sélecteur de colonne).
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className={uiChip.soft}
            >
              {loading ? "…" : "Rafraîchir"}
            </button>
            <label className={cn("flex items-center gap-2 text-xs", uiText.subtle)}>
              <input
                type="checkbox"
                checked={showQuiet}
                onChange={(e) => setShowQuiet(e.target.checked)}
              />
              Afficher colonnes calmes (inbox / plus tard / done vides)
            </label>
          </div>
        </div>
        <p className={jtKanban.focusFoot}>
          {board.where} · WIP En cours = 1 · Clique une carte → fiche à droite
          (desktop) ou popup (mobile). Une carte = une seule colonne.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <div className="min-w-0">
          <div className="flex gap-3 overflow-x-auto pb-4">
            {visibleColumns.map((col) => {
              const isCollapsed = !!collapsed[col.id];
              return (
                <section
                  key={col.id}
                  data-jt-kanban={col.id}
                  className={cn(jtKanban.col, col.overWip && jtKanban.overWip)}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((s) => ({ ...s, [col.id]: !s[col.id] }))
                    }
                    className={jtKanban.header}
                  >
                    <div>
                      <p className={jtKanban.title}>
                        {col.short}
                        <span className={jtKanban.count}>
                          ({col.cards.length}
                          {col.wip != null ? `/${col.wip}` : ""})
                        </span>
                      </p>
                      <p className={jtKanban.hint}>{col.hint}</p>
                    </div>
                    <span className={jtKanban.chevron}>
                      {isCollapsed ? "▸" : "▾"}
                    </span>
                  </button>
                  {!isCollapsed ? (
                    <ul className="max-h-[70vh] space-y-2 overflow-y-auto px-2 pb-3">
                      {col.cards.length === 0 ? (
                        <li className={jtKanban.empty}>Vide</li>
                      ) : (
                        col.cards.map((card) => {
                          const isBoardTask =
                            !!board.validation.tasks[card.id];
                          const pad = Math.min(card.depth, 3) * 8;
                          return (
                            <li
                              key={card.id}
                              className={cn(
                                jtKanban.card,
                                selectedId === card.id &&
                                  "ring-2 ring-indigo-500",
                              )}
                              style={{ marginLeft: pad }}
                            >
                              <button
                                type="button"
                                className="w-full text-left"
                                onClick={() => {
                                  if (isBoardTask) openCard(card.id);
                                }}
                              >
                                <p className={jtKanban.cardMeta}>
                                  {card.kind === "feedback"
                                    ? "retour"
                                    : card.kind === "error"
                                      ? "erreur"
                                      : card.id}
                                </p>
                                <p className={jtKanban.cardLabel}>
                                  {card.label}
                                </p>
                                {card.kind === "task" ||
                                card.kind === "block" ? (
                                  <span
                                    className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${taskStatusClass(card.status)}`}
                                  >
                                    {taskStatusLabel(card.status)}
                                  </span>
                                ) : null}
                              </button>
                              {canWrite && isBoardTask ? (
                                <div className="mt-1 space-y-1">
                                  {col.id !== "doing" ? (
                                    <button
                                      type="button"
                                      disabled={acting}
                                      className={uiChip.primary}
                                      onClick={() =>
                                        run({
                                          type: "focus",
                                          itemId: card.id,
                                        })
                                      }
                                    >
                                      En cours
                                    </button>
                                  ) : null}
                                  <ColumnMoveControl
                                    taskId={card.id}
                                    currentColumn={col.id}
                                    canWrite={canWrite}
                                    acting={acting}
                                    onAction={run}
                                    compact
                                  />
                                </div>
                              ) : null}
                              {canWrite && !isBoardTask ? (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <button
                                    type="button"
                                    disabled={acting}
                                    className={uiChip.accent}
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
                                    className={uiChip.primary}
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
        </div>

        {isDesktop ? (
          <aside
            className={cn(
              uiSurfaces.panel,
              "hidden min-h-[420px] self-start overflow-hidden lg:sticky lg:top-4 lg:block",
            )}
          >
            {selected ? (
              <PilotageTaskDetail
                task={selected}
                cycle={selectedCycle}
                canWrite={canWrite}
                acting={acting}
                onClose={() => setSelectedId(null)}
                onAction={run}
                embedded
              />
            ) : (
              <p className={cn("p-6 text-sm", uiText.subtle)}>
                Clique une carte pour le détail à droite (sous-critères, colonne,
                OK/KO).
              </p>
            )}
          </aside>
        ) : null}
      </div>

      {!isDesktop && selected ? (
        <PilotageTaskDetail
          task={selected}
          cycle={selectedCycle}
          canWrite={canWrite}
          acting={acting}
          onClose={() => setSelectedId(null)}
          onAction={run}
        />
      ) : null}
    </div>
  );
}
