"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/features";
import { useAuth } from "@/lib/hooks/auth";
import suivi from "@/lib/pilotage/suiviActif.json";
import { PILOTAGE_FILES } from "@/lib/pilotage/allowedFiles";
import type { BoardItem, PilotageBoard } from "@/lib/pilotage/board";

type QueueItem = { id: string; status: string; label: string };
type FixItem = { id: string; label: string; status: string };

type FileListItem = {
  id: string;
  label: string;
  description: string;
  writable: boolean;
  contentType: string;
  path: string;
};

type FilePayload = {
  id: string;
  label: string;
  description: string;
  path: string;
  contentType: string;
  writable: boolean;
  content: string;
  redactedCount: number;
  mtime?: string;
};

type BoardResponse = {
  success: boolean;
  interactive?: boolean;
  runtimeEnv?: string;
  canWrite?: boolean;
  board?: PilotageBoard;
  error?: string;
};

type Tab = "board" | "overview" | "files";

function statusBadge(status: BoardItem["status"]) {
  switch (status) {
    case "ok":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
    case "ko":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
    case "active":
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
    case "open":
      return "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

export default function PilotagePage() {
  const { user, token } = useAuth();
  const allowed =
    user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const canWriteRole = user?.role === "SUPER_ADMIN";

  const queue = (suivi.queue ?? []) as QueueItem[];
  const fixes = (suivi.openFixes ?? []) as FixItem[];
  const recent = suivi.recentDone ?? [];
  const active = useMemo(
    () => queue.find((q) => q.status === "active") ?? queue[0],
    [queue],
  );

  const [tab, setTab] = useState<Tab>("board");
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
  const [actingId, setActingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

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
    if (allowed && token) {
      void loadFileList();
      void loadBoard();
    }
  }, [allowed, token, loadFileList, loadBoard]);

  useEffect(() => {
    if (tab === "files" && allowed && token) void loadFile(fileId);
  }, [tab, fileId, allowed, token, loadFile]);

  const decide = async (itemId: string, decision: "OK" | "KO") => {
    if (!canWriteBoard) return;
    setActingId(itemId);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/pilotage/board/action", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          itemId,
          decision,
          note: notes[itemId]?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErr(data.error || "Action refusée");
        return;
      }
      setMsg(data.message || `${itemId} → ${decision}`);
      if (data.board) setBoard(data.board);
      else await loadBoard();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setActingId(null);
    }
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
        path: `docs/pilotage/${f.relativePath}`,
      }));

  const openAValider =
    board?.itemsAValider.filter((i) => i.status === "open") ?? [];
  const decidedAValider =
    board?.itemsAValider.filter((i) => i.status !== "open") ?? [];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="space-y-2">
          <Link
            href="/backoffice"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <span aria-hidden>←</span>
            Retour vue d&apos;ensemble
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Pilotage — suivi des tâches
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Parse les{" "}
            <code className="text-xs">docs/pilotage/*.md</code> · OK/KO écrit
            dans les fichiers · écriture{" "}
            {interactive ? "autorisée" : "bloquée"} (
            <code className="text-xs">{runtimeEnv}</code>)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["board", "Tableau de suivi"],
              ["overview", "Vue synthèse"],
              ["files", "Fichiers bruts"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === id
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {err && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {err}
          </div>
        )}
        {msg && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
            {msg}
          </div>
        )}

        {tab === "board" && (
          <div className="space-y-8">
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                    Où j&apos;en suis
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
                    {board?.where ??
                      `Phase ${suivi.phase.id} · ${suivi.phase.step} · ${active?.id ?? suivi.phase.point}`}
                  </p>
                  <p className="mt-1 text-gray-700 dark:text-gray-300">
                    {active?.label ?? suivi.phase.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadBoard()}
                  disabled={loadingBoard}
                  className="rounded-lg bg-white/80 px-3 py-1.5 text-sm dark:bg-gray-900/60"
                >
                  {loadingBoard ? "…" : "Rafraîchir"}
                </button>
              </div>
              {!interactive && (
                <p className="mt-3 text-sm text-amber-900 dark:text-amber-100">
                  Lecture seule : environnement production (ou non autorisé).
                  Les actions OK/KO / édition md sont réservées à dev / préprod /
                  staging.
                </p>
              )}
              {interactive && !canWriteBoard && (
                <p className="mt-3 text-sm text-amber-900 dark:text-amber-100">
                  Compte ADMIN : lecture du tableau. SUPER_ADMIN pour valider
                  OK/KO.
                </p>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                À valider ({openAValider.length} ouvert
                {openAValider.length > 1 ? "s" : ""})
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Source :{" "}
                <code className="text-xs">TODOS_A_VALIDER.md</code> — OK/KO
                écrit directement dans le fichier (+ note dans A_TESTER).
              </p>
              {loadingBoard && !board ? (
                <p className="text-sm text-gray-500">Chargement…</p>
              ) : openAValider.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Aucun item ouvert à valider.
                </p>
              ) : (
                <ul className="space-y-3">
                  {openAValider.map((item) => (
                    <li
                      key={`${item.section}-${item.id}`}
                      className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs text-gray-500">
                            {item.id}
                            <span className="ml-2 font-sans text-gray-400">
                              · {item.section}
                            </span>
                          </p>
                          <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                            {item.label}
                          </p>
                          {item.notes ? (
                            <p className="mt-1 text-sm text-gray-500">
                              {item.notes}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(item.status)}`}
                        >
                          à faire
                        </span>
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          placeholder="Note (optionnelle)"
                          value={notes[item.id] ?? ""}
                          onChange={(e) =>
                            setNotes((n) => ({
                              ...n,
                              [item.id]: e.target.value,
                            }))
                          }
                          disabled={!canWriteBoard}
                          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-950"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={!canWriteBoard || actingId === item.id}
                            onClick={() => void decide(item.id, "OK")}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            disabled={!canWriteBoard || actingId === item.id}
                            onClick={() => void decide(item.id, "KO")}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                          >
                            KO
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {(board?.itemsEnCours.length ?? 0) > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  En cours (TODOS.md)
                </h2>
                <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                  {board!.itemsEnCours.map((item) => (
                    <li
                      key={item.id}
                      className="bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/30"
                    >
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        <span className="font-mono text-xs">{item.id}</span> —{" "}
                        {item.label}
                      </p>
                      {item.action ? (
                        <p className="mt-1 text-gray-600 dark:text-gray-400">
                          {item.action}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {decidedAValider.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Déjà décidé
                </h2>
                <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                  {decidedAValider.map((item) => (
                    <li
                      key={`done-${item.section}-${item.id}`}
                      className="flex items-center justify-between bg-white px-4 py-3 text-sm dark:bg-gray-900"
                    >
                      <span>
                        <span className="font-mono text-xs text-gray-500">
                          {item.id}
                        </span>{" "}
                        {item.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(item.status)}`}
                      >
                        {item.decision || item.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {tab === "overview" && (
          <div className="space-y-8">
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Snapshot bundlé
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
                Phase {suivi.phase.id} · {suivi.phase.step} ·{" "}
                {suivi.phase.subStep} · {active?.id ?? suivi.phase.point}
              </p>
              <p className="mt-1 text-gray-700 dark:text-gray-300">
                {active?.label ?? suivi.phase.title}
              </p>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                APK {suivi.apk} · mis à jour {suivi.updatedAt}
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Process
              </h2>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
                <li>
                  <strong>TODOS.md</strong> — quoi faire
                </li>
                <li>
                  <strong>TODOS_A_TESTER.md</strong> — tests & résultats
                </li>
                <li>
                  OK → <strong>TODOS_DONE.md</strong> · KO → retour{" "}
                  <strong>TODOS.md</strong>
                </li>
                <li>
                  Porteur : phase active dans{" "}
                  <strong>TODOS_A_VALIDER.md</strong> (onglet Tableau)
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setTab("board")}
                className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Ouvrir le tableau de suivi →
              </button>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                File B2
              </h2>
              <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                {queue.map((item) => (
                  <li
                    key={item.id}
                    className={`flex items-center justify-between px-4 py-3 text-sm ${
                      item.status === "active"
                        ? "bg-amber-50 dark:bg-amber-950/40"
                        : "bg-white dark:bg-gray-900"
                    }`}
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {item.id} — {item.label}
                    </span>
                    <span
                      className={
                        item.status === "active"
                          ? "rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-800 dark:text-amber-100"
                          : "text-xs text-gray-500"
                      }
                    >
                      {item.status === "active" ? "▶ en cours" : "en attente"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Récemment terminé
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
                {recent.map((r) => (
                  <li key={r.id}>
                    <span className="font-mono text-xs">{r.id}</span> —{" "}
                    {r.label}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Correctifs / diagnostics ouverts
              </h2>
              <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                {fixes.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between bg-white px-4 py-3 text-sm dark:bg-gray-900"
                  >
                    <span>
                      <span className="font-mono text-xs text-gray-500">
                        {f.id}
                      </span>{" "}
                      {f.label}
                    </span>
                    <span className="text-xs text-gray-500">{f.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === "files" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {fileTabs.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFileId(f.id)}
                  className={`rounded-lg border px-3 py-1.5 text-left text-xs sm:text-sm ${
                    fileId === f.id
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100"
                      : "border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  }`}
                  title={f.description}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {fileData ? (
                  <>
                    <code className="text-xs">{fileData.path}</code>
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
                  className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm dark:bg-gray-800"
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
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>

            {!canWriteRole && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Compte ADMIN : lecture seule. Passez SUPER_ADMIN pour éditer.
              </p>
            )}
            {canWriteRole && !interactive && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Écriture fichiers désactivée hors dev/préprod (
                {runtimeEnv}).
              </p>
            )}

            {loadingFile ? (
              <p className="text-sm text-gray-500">Chargement…</p>
            ) : (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                readOnly={
                  !canWriteRole || !interactive || !fileData?.writable
                }
                spellCheck={false}
                className="h-[min(70vh,720px)] w-full resize-y rounded-xl border border-gray-300 bg-white p-4 font-mono text-xs leading-relaxed text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
