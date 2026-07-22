"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { BoardItem, PilotageBoard } from "@/lib/pilotage/board";
import type { ValidationTask } from "@/lib/pilotage/validationBoardTypes";
import {
  cycleStatusClass,
  taskStatusClass,
  taskStatusLabel,
  type BoardActionPayload,
} from "@/components/pilotage/pilotageUi";
import { PilotageTaskDetail } from "@/components/pilotage/PilotageTaskDetail";

function AccordionSection({
  id,
  title,
  count,
  open,
  onToggle,
  children,
  defaultHint,
}: {
  id: string;
  title: string;
  count?: number;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
  defaultHint?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between gap-3 bg-gray-50 px-4 py-3 text-left dark:bg-gray-900/80"
        aria-expanded={open}
      >
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {title}
          {typeof count === "number" ? (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({count})
            </span>
          ) : null}
        </span>
        <span className="text-gray-500" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? (
        <div className="border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 sm:p-4">
          {children}
        </div>
      ) : defaultHint ? (
        <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400 dark:border-gray-800">
          {defaultHint}
        </p>
      ) : null}
    </section>
  );
}

function MdItemRow({
  item,
  onOpen,
}: {
  item: BoardItem;
  onOpen?: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-50 disabled:cursor-default dark:hover:bg-gray-800/50"
      >
        <div className="min-w-0">
          <p className="font-mono text-xs text-gray-500">
            {item.completedAtLabel ? (
              <span className="mr-2 font-sans font-semibold text-emerald-700 dark:text-emerald-400">
                {item.completedAtLabel}
              </span>
            ) : null}
            {item.id}
            {item.phase ? (
              <span className="ml-2 font-sans text-gray-400">
                · {item.phase}
              </span>
            ) : null}
            <span className="ml-2 font-sans text-gray-400">
              · {item.section}
            </span>
          </p>
          <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">
            {item.label}
          </p>
          {item.action ? (
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              {item.action}
            </p>
          ) : null}
          {item.notes ? (
            <p className="mt-0.5 text-xs text-gray-500">{item.notes}</p>
          ) : null}
          {item.decision ? (
            <p className="mt-0.5 text-xs text-gray-500">
              Décision : {item.decision}
            </p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${taskStatusClass(item.status as ValidationTask["status"])}`}
        >
          {taskStatusLabel(item.status as ValidationTask["status"])}
        </span>
      </button>
    </li>
  );
}

export function PilotageBoardView({
  board,
  canWrite,
  loading,
  onRefresh,
  onAction,
}: {
  board: PilotageBoard;
  canWrite: boolean;
  loading: boolean;
  onRefresh: () => void;
  onAction: (payload: BoardActionPayload) => Promise<void>;
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    now: true,
    cycles: true,
    later: false,
    decided: false,
    enCours: true,
    aValider: true,
    todosAll: false,
    termines: true,
  });
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const toggle = (id: string) =>
    setOpenSections((s) => ({ ...s, [id]: !s[id] }));

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return board.validation.tasks[selectedId] ?? null;
  }, [board.validation.tasks, selectedId]);

  const selectedCycle = useMemo(() => {
    if (!selected?.cycleId) return null;
    return board.cycles.find((c) => c.id === selected.cycleId) ?? null;
  }, [board.cycles, selected]);

  const cycleTasks = useMemo(() => {
    if (!cycleId) return [];
    const cycle = board.cycles.find((c) => c.id === cycleId);
    if (!cycle) return [];
    return cycle.itemIds
      .map((id) => board.validation.tasks[id])
      .filter(Boolean) as ValidationTask[];
  }, [board, cycleId]);

  const runAction = async (payload: BoardActionPayload) => {
    setActing(true);
    try {
      await onAction(payload);
    } finally {
      setActing(false);
    }
  };

  const openTask = (id: string) => {
    if (board.validation.tasks[id]) setSelectedId(id);
  };

  const renderValidationList = (tasks: ValidationTask[]) =>
    tasks.length === 0 ? (
      <p className="px-2 py-3 text-sm text-gray-500">Aucune tâche.</p>
    ) : (
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {tasks.map((task) => {
          const done = task.checklist.filter((c) => c.done).length;
          const total = task.checklist.length;
          return (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => setSelectedId(task.id)}
                className={`flex w-full items-start justify-between gap-3 px-3 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                  selectedId === task.id
                    ? "bg-indigo-50 dark:bg-indigo-950/30"
                    : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-gray-500">
                    {task.id}
                    {task.cycleId ? (
                      <span className="ml-2 font-sans text-gray-400">
                        · {task.cycleId}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">
                    {task.label}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                    {task.description}
                  </p>
                  {total > 0 ? (
                    <p className="mt-0.5 text-xs text-gray-500">
                      Critères {done}/{total}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${taskStatusClass(task.status)}`}
                >
                  {taskStatusLabel(task.status)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Où j&apos;en suis
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
              {board.where}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Validation UI {board.tasksNow.length} · Plus tard{" "}
              {board.tasksLater.length} · TODOS en cours{" "}
              {board.itemsEnCours.length} · Terminées{" "}
              {board.itemsTermines.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-lg bg-white/80 px-3 py-1.5 text-sm dark:bg-gray-900/60"
          >
            {loading ? "…" : "Rafraîchir"}
          </button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="space-y-3">
          <AccordionSection
            id="now"
            title="À valider maintenant (UI)"
            count={board.tasksNow.length}
            open={!!openSections.now}
            onToggle={toggle}
          >
            {renderValidationList(board.tasksNow)}
          </AccordionSection>

          <AccordionSection
            id="cycles"
            title="Cycles"
            count={board.cycles.length}
            open={!!openSections.cycles}
            onToggle={toggle}
          >
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              {board.cycles.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCycleId(c.id === cycleId ? null : c.id)}
                  className={`rounded-lg border p-3 text-left ${cycleStatusClass(c.status)} ${
                    cycleId === c.id ? "ring-2 ring-indigo-500" : ""
                  }`}
                >
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {c.label}
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {c.description}
                  </p>
                  <p className="mt-2 text-sm font-medium">{c.progressLabel}</p>
                </button>
              ))}
            </div>
            {cycleId ? renderValidationList(cycleTasks) : (
              <p className="text-xs text-gray-500">
                Sélectionnez un cycle pour lister ses tâches détaillées.
              </p>
            )}
          </AccordionSection>

          <AccordionSection
            id="later"
            title="Plus tard"
            count={board.tasksLater.length}
            open={!!openSections.later}
            onToggle={toggle}
          >
            {renderValidationList(board.tasksLater)}
          </AccordionSection>

          <AccordionSection
            id="termines"
            title="Terminées"
            count={board.itemsTermines.length}
            open={!!openSections.termines}
            onToggle={toggle}
            defaultHint="Chronologique — Récemment terminé (TODOS.md) + A_VALIDER OK/KO + TODOS_DONE"
          >
            {board.itemsTermines.length === 0 ? (
              <p className="px-2 py-3 text-sm text-gray-500">
                Aucune tâche terminée pour l’instant.
              </p>
            ) : (
              <ul className="max-h-[520px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                {board.itemsTermines.map((item) => (
                  <MdItemRow
                    key={`tm-${item.source}-${item.section}-${item.id}-${item.completedAt}`}
                    item={item}
                    onOpen={
                      board.validation.tasks[item.id]
                        ? () => openTask(item.id)
                        : undefined
                    }
                  />
                ))}
              </ul>
            )}
          </AccordionSection>

          <AccordionSection
            id="aValider"
            title="TODOS_A_VALIDER.md (toutes lignes)"
            count={board.itemsAValider.length}
            open={!!openSections.aValider}
            onToggle={toggle}
            defaultHint="Source markdown phase active"
          >
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {board.itemsAValider.map((item) => (
                <MdItemRow
                  key={`av-${item.section}-${item.id}`}
                  item={item}
                  onOpen={
                    board.validation.tasks[item.id]
                      ? () => openTask(item.id)
                      : undefined
                  }
                />
              ))}
            </ul>
          </AccordionSection>

          <AccordionSection
            id="enCours"
            title="En cours (TODOS.md)"
            count={board.itemsEnCours.length}
            open={!!openSections.enCours}
            onToggle={toggle}
          >
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {board.itemsEnCours.map((item) => (
                <MdItemRow
                  key={`ec-${item.id}`}
                  item={item}
                  onOpen={
                    board.validation.tasks[item.id.replace(/^B2-/, "")] ||
                    board.validation.tasks[item.id]
                      ? () =>
                          openTask(
                            board.validation.tasks[item.id]
                              ? item.id
                              : item.id.replace(/^B2-/, ""),
                          )
                      : undefined
                  }
                />
              ))}
            </ul>
          </AccordionSection>

          <AccordionSection
            id="todosAll"
            title="Catalogue TODOS.md (tables)"
            count={board.itemsTodosAll.length}
            open={!!openSections.todosAll}
            onToggle={toggle}
            defaultHint="Backlog / file phase — détail action depuis les md"
          >
            <ul className="max-h-[480px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
              {board.itemsTodosAll.map((item) => (
                <MdItemRow
                  key={`all-${item.section}-${item.id}`}
                  item={item}
                />
              ))}
            </ul>
          </AccordionSection>
        </div>

        {isDesktop ? (
          <div className="hidden min-h-[420px] self-start overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 lg:sticky lg:top-4 lg:block">
            {selected ? (
              <PilotageTaskDetail
                task={selected}
                cycle={selectedCycle}
                canWrite={canWrite}
                acting={acting}
                onAction={runAction}
                embedded
              />
            ) : (
              <p className="p-6 text-sm text-gray-500">
                Sélectionnez une tâche de validation pour le détail complet
                (sous-critères, notes, décisions).
              </p>
            )}
          </div>
        ) : null}
      </div>

      {!isDesktop && selected ? (
        <PilotageTaskDetail
          task={selected}
          cycle={selectedCycle}
          canWrite={canWrite}
          acting={acting}
          onClose={() => setSelectedId(null)}
          onAction={runAction}
        />
      ) : null}
    </div>
  );
}
