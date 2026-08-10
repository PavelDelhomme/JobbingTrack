"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/features";
import { PilotageKanbanView } from "@/components/pilotage/PilotageKanbanView";
import type { BoardActionPayload } from "@/components/pilotage/pilotageUi";
import { useAuth } from "@/lib/hooks/auth";
import suivi from "@/lib/pilotage/suiviActif.json";
import { PILOTAGE_FILES, displayDocsPath } from "@/lib/pilotage/allowedFiles";
import type { PilotageBoard } from "@/lib/pilotage/board";
import { uiSurfaces, uiText } from "@/lib/ui/surfaces";
import { StatusAlert } from "@/lib/ui/feedback/StatusAlert";
import { cn } from "@/lib/utils";

const PilotageBoardView = dynamic(
  () =>
    import("@/components/pilotage/PilotageBoardView").then((m) => ({
      default: m.PilotageBoardView,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Chargement de la liste détaillée…
      </p>
    ),
  },
);

type QueueItem = { id: string; status: string; label: string };
type FixItem = { id: string; label: string; status: string };

type FileListItem = {
  id: string;
  label: string;
  description: string;
  writable: boolean;
  contentType: string;
  path: string;
  sensitive?: boolean;
};

type FilePayload = {
  id: string;
  label: string;
  description: string;
  path: string;
  contentType: string;
  writable: boolean;
  sensitive?: boolean;
  content: string;
  redactedCount: number;
  mtime?: string;
};

const FILE_GROUPS: { title: string; ids: string[] }[] = [
  {
    title: "Pilotage (phase)",
    ids: [
      "PILOTAGE",
      "TODOS",
      "TODOS_A_TESTER",
      "TODOS_A_VALIDER",
      "TODOS_DONE",
      "GUIDE_VALIDATION_PORTEUR",
      "AUDIT_QA_EXHAUSTIF",
      "SUIVI_ACTIF",
      "VALIDATION_BOARD",
    ],
  },
  {
    title: "Docs projet",
    ids: ["STATUS", "PLAN", "BACKLOG", "ERRORS", "RESOLUTIONS"],
  },
];

type BoardResponse = {
  success: boolean;
  interactive?: boolean;
  runtimeEnv?: string;
  canWrite?: boolean;
  board?: PilotageBoard;
  error?: string;
};

type Tab = "kanban" | "board" | "overview" | "files";

export default function PilotagePage() {
  const { user, token } = useAuth();
  const allowed =
    user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const canWriteRole = user?.role === "SUPER_ADMIN";

  const queue = useMemo(
    () => (suivi.queue ?? []) as QueueItem[],
    [],
  );
  const fixes = (suivi.openFixes ?? []) as FixItem[];
  const recent = suivi.recentDone ?? [];
  const active = useMemo(
    () => queue.find((q) => q.status === "active") ?? queue[0],
    [queue],
  );

  const [tab, setTab] = useState<Tab>("kanban");
  const [fileId, setFileId] = useState<string>("TODOS_A_VALIDER");
  const [files, setFiles] = useState<FileListItem[]>([]);
  const [fileData, setFileData] = useState<FilePayload | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [board, setBoard] = useState<PilotageBoard | null>(null);
  const [interactive, setInteractive] = useState(false);
  const [canWriteBoard, setCanWriteBoard] = useState(false);
  const [runtimeEnv, setRuntimeEnv] = useState("?");
  const [loadingBoard, setLoadingBoard] = useState(false);

  const authHeaders = useCallback((): HeadersInit => {
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }, [token]);

  const loadBoard = useCallback(async () => {
    if (!token) return;
    setLoadingBoard(true);
    setErr(null);
    try {
      const res = await fetch("/api/pilotage/board", { headers: authHeaders() });
      const data = (await res.json()) as BoardResponse;
      if (!res.ok || !data.success || !data.board) {
        setErr(data.error || "Chargement du tableau impossible");
        return;
      }
      setBoard(data.board);
      setInteractive(Boolean(data.interactive));
      setCanWriteBoard(Boolean(data.canWrite));
      setRuntimeEnv(data.runtimeEnv || "?");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoadingBoard(false);
    }
  }, [authHeaders, token]);

  const loadFileList = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/pilotage/files", { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setFiles(data.files);
    } catch {
      /* ignore */
    }
  }, [authHeaders, token]);

  const loadFile = useCallback(
    async (id: string) => {
      if (!token) return;
      setLoadingFile(true);
      setErr(null);
      setMsg(null);
      try {
        const res = await fetch(`/api/pilotage/files/${id}`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setErr(data.error || "Chargement impossible");
          setFileData(null);
          return;
        }
        setFileData(data.file);
        setDraft(data.file.content);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Erreur réseau");
      } finally {
        setLoadingFile(false);
      }
    },
    [authHeaders, token],
  );

  useEffect(() => {
    if (allowed && token) void loadBoard();
  }, [allowed, token, loadBoard]);

  // Liste fichiers seulement quand l’onglet est ouvert (évite fetch inutile au boot Kanban).
  useEffect(() => {
    if (tab === "files" && allowed && token) {
      void loadFileList();
      void loadFile(fileId);
    }
  }, [tab, fileId, allowed, token, loadFileList, loadFile]);

  const runBoardAction = async (payload: BoardActionPayload) => {
    if (!canWriteBoard) return;
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/pilotage/board/action", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setErr(data.error || "Action refusée");
      throw new Error(data.error || "Action refusée");
    }
    setMsg(data.message || "OK");
    if (data.board) setBoard(data.board);
    else await loadBoard();
  };

  const saveFile = async () => {
    if (!canWriteRole || !fileData?.writable) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/pilotage/files/${fileId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ content: draft }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErr(data.error || "Enregistrement refusé");
        return;
      }
      setMsg(`Enregistré · ${data.file?.path ?? fileId}`);
      await loadFile(fileId);
      await loadBoard();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  if (user && !allowed) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p className="text-red-600 dark:text-red-400">
            Accès réservé aux comptes ADMIN / SUPER_ADMIN.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const fileTabs = files.length
    ? files
    : PILOTAGE_FILES.map((f) => ({
        id: f.id,
        label: f.label,
        description: f.description,
        writable: f.writable && canWriteRole,
        contentType: f.contentType,
        path: displayDocsPath(f),
        sensitive: !!f.sensitive,
      }));

  const fileById = new Map(fileTabs.map((f) => [f.id, f]));

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <Link
            href="/backoffice"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <span aria-hidden>←</span>
            Retour vue d&apos;ensemble
          </Link>
          <h1 className={uiText.heading}>
            Pilotage — suivi des tâches
          </h1>
          <p className={cn("text-sm", uiText.subtle)}>
            Validation porteur en{" "}
            <strong>HTTPS</strong> :{" "}
            <a
              className="text-indigo-600 underline dark:text-indigo-400"
              href="https://jobbingtrack.localhost:5443/backoffice/pilotage"
            >
              https://jobbingtrack.localhost:5443/backoffice/pilotage
            </a>
            {" · "}
            ne pas utiliser <code className="text-xs">https://localhost:5003</code>{" "}
            (ERR_SSL) · écriture{" "}
            {interactive ? "autorisée" : "bloquée"} (
            <code className="text-xs">{runtimeEnv}</code>)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["kanban", "Kanban"],
              ["board", "Liste détaillée"],
              ["overview", "Vue synthèse"],
              ["files", "Fichiers bruts"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={tab === id ? uiSurfaces.tabActive : uiSurfaces.tabIdle}
            >
              {label}
            </button>
          ))}
        </div>

        {err && (
          <StatusAlert tone="critical" title="Erreur">
            {err}
          </StatusAlert>
        )}
        {msg && (
          <StatusAlert tone="success" title="OK">
            {msg}
          </StatusAlert>
        )}

        {tab === "kanban" && (
          <div className="space-y-3">
            {!interactive && (
              <StatusAlert tone="warning" title="Lecture seule">
                Environnement production — actions désactivées.
              </StatusAlert>
            )}
            {loadingBoard && !board ? (
              <p className={cn("text-sm", uiText.subtle)}>Chargement…</p>
            ) : board ? (
              <PilotageKanbanView
                board={board}
                canWrite={canWriteBoard}
                loading={loadingBoard}
                token={token}
                onRefresh={() => void loadBoard()}
                onAction={runBoardAction}
              />
            ) : (
              <p className={cn("text-sm", uiText.subtle)}>Kanban indisponible.</p>
            )}
          </div>
        )}

        {tab === "board" && (
          <div className="space-y-3">
            {!interactive && (
              <StatusAlert tone="warning" title="Lecture seule">
                Environnement production. Actions réservées à dev / préprod /
                staging.
              </StatusAlert>
            )}
            {interactive && !canWriteBoard && (
              <StatusAlert tone="warning" title="Droits limités">
                Compte ADMIN : lecture. SUPER_ADMIN pour valider.
              </StatusAlert>
            )}
            {loadingBoard && !board ? (
              <p className={cn("text-sm", uiText.subtle)}>Chargement…</p>
            ) : board ? (
              <PilotageBoardView
                board={board}
                canWrite={canWriteBoard}
                loading={loadingBoard}
                onRefresh={() => void loadBoard()}
                onAction={runBoardAction}
              />
            ) : (
              <p className={cn("text-sm", uiText.subtle)}>Tableau indisponible.</p>
            )}
          </div>
        )}

        {tab === "overview" && (
          <div className="space-y-8">
            <StatusAlert
              tone="warning"
              title={`Phase ${suivi.phase.id} · ${suivi.phase.step} · ${suivi.phase.subStep} · ${active?.id ?? suivi.phase.point}`}
              footer={`APK ${suivi.apk} · mis à jour ${suivi.updatedAt}`}
            >
              {active?.label ?? suivi.phase.title}
            </StatusAlert>

            <section className="space-y-3">
              <h2 className={uiText.subheading}>Process</h2>
              <ol className={cn("list-decimal space-y-1 pl-5 text-sm", uiText.muted)}>
                <li>
                  Valider dans l&apos;onglet <strong>Kanban / Liste</strong>{" "}
                  (fiche détail + checklist).
                </li>
                <li>
                  Sync automatique vers{" "}
                  <strong>validation-board.json</strong> +{" "}
                  <strong>TODOS_A_VALIDER.md</strong>.
                </li>
                <li>
                  Preuves appendées dans <strong>TODOS_A_TESTER.md</strong>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setTab("board")}
                className={uiText.linkAccent}
              >
                Ouvrir le tableau de suivi →
              </button>
            </section>

            <section className="space-y-3">
              <h2 className={uiText.subheading}>File B2</h2>
              <ul className={cn(uiSurfaces.tableWrap, "divide-y divide-gray-200 dark:divide-gray-700")}>
                {queue.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 text-sm",
                      item.status === "active"
                        ? "bg-amber-950/10 dark:bg-amber-950/40"
                        : "bg-white dark:bg-gray-900",
                    )}
                  >
                    <span className={cn("font-medium", uiText.body)}>
                      {item.id} — {item.label}
                    </span>
                    <span
                      className={
                        item.status === "active"
                          ? "rounded-full bg-amber-700 px-2 py-0.5 text-xs font-semibold text-white"
                          : cn("text-xs", uiText.subtle)
                      }
                    >
                      {item.status === "active" ? "▶ en cours" : "en attente"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className={uiText.subheading}>Récemment terminé</h2>
              <ul className={cn("list-disc space-y-1 pl-5 text-sm", uiText.muted)}>
                {recent.map((r) => (
                  <li key={r.id}>
                    <span className={uiText.mono}>{r.id}</span> — {r.label}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className={uiText.subheading}>
                Correctifs / diagnostics ouverts
              </h2>
              <ul className={cn(uiSurfaces.tableWrap, "divide-y divide-gray-200 dark:divide-gray-700")}>
                {fixes.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between bg-white px-4 py-3 text-sm dark:bg-gray-900"
                  >
                    <span>
                      <span className={uiText.mono}>{f.id}</span> {f.label}
                    </span>
                    <span className={cn("text-xs", uiText.subtle)}>{f.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === "files" && (
          <div className="space-y-4">
            {FILE_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className={cn("text-xs font-semibold uppercase tracking-wide", uiText.subtle)}>
                  {group.title}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.ids.map((id) => {
                    const f = fileById.get(id);
                    if (!f) return null;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFileId(f.id)}
                        className={
                          fileId === f.id
                            ? uiSurfaces.chipActive
                            : uiSurfaces.chipIdle
                        }
                        title={f.description}
                      >
                        {f.label}
                        {f.sensitive ? (
                          <span className="ml-1 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                            · privé
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={cn("text-sm", uiText.subtle)}>
                {fileData ? (
                  <>
                    <code className="text-xs">{fileData.path}</code>
                    {fileData.sensitive && (
                      <span className="ml-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                        · API ADMIN only (pas de static public)
                      </span>
                    )}
                    {fileData.mtime && (
                      <span className="ml-2 text-xs">
                        · {new Date(fileData.mtime).toLocaleString("fr-FR")}
                      </span>
                    )}
                    {fileData.redactedCount > 0 && (
                      <span className="ml-2 text-xs text-amber-700 dark:text-amber-300">
                        · {fileData.redactedCount} secret(s) masqué(s)
                      </span>
                    )}
                  </>
                ) : (
                  "Sélectionnez un fichier"
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => loadFile(fileId)}
                  disabled={loadingFile}
                  className={uiSurfaces.btnSecondary}
                >
                  Recharger
                </button>
                <button
                  type="button"
                  onClick={() => void saveFile()}
                  disabled={
                    saving ||
                    !canWriteRole ||
                    !interactive ||
                    !fileData?.writable ||
                    loadingFile ||
                    draft === fileData?.content
                  }
                  className={uiSurfaces.btnPrimary}
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>

            {!canWriteRole && (
              <StatusAlert tone="warning" title="Lecture seule">
                Compte ADMIN : passez SUPER_ADMIN pour éditer.
              </StatusAlert>
            )}
            {canWriteRole && !interactive && (
              <StatusAlert tone="warning" title="Écriture désactivée">
                Hors dev/préprod ({runtimeEnv}).
              </StatusAlert>
            )}

            {loadingFile ? (
              <p className={cn("text-sm", uiText.subtle)}>Chargement…</p>
            ) : (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                readOnly={
                  !canWriteRole || !interactive || !fileData?.writable
                }
                spellCheck={false}
                className={uiSurfaces.input}
              />
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
