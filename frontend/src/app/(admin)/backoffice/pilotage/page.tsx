"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/features";
import { useAuth } from "@/lib/hooks/auth";
import suivi from "@/lib/pilotage/suiviActif.json";
import { PILOTAGE_FILES } from "@/lib/pilotage/allowedFiles";

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

export default function PilotagePage() {
  const { user, token } = useAuth();
  const allowed =
    user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const canWrite = user?.role === "SUPER_ADMIN";

  const queue = (suivi.queue ?? []) as QueueItem[];
  const fixes = (suivi.openFixes ?? []) as FixItem[];
  const recent = suivi.recentDone ?? [];
  const active = useMemo(
    () => queue.find((q) => q.status === "active") ?? queue[0],
    [queue],
  );

  const [tab, setTab] = useState<"overview" | "files">("overview");
  const [fileId, setFileId] = useState<string>("TODOS_A_VALIDER");
  const [files, setFiles] = useState<FileListItem[]>([]);
  const [fileData, setFileData] = useState<FilePayload | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const authHeaders = useCallback((): HeadersInit => {
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }, [token]);

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
    if (allowed && token) void loadFileList();
  }, [allowed, token, loadFileList]);

  useEffect(() => {
    if (tab === "files" && allowed && token) void loadFile(fileId);
  }, [tab, fileId, allowed, token, loadFile]);

  const saveFile = async () => {
    if (!canWrite || !fileData?.writable) return;
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
        writable: f.writable && canWrite,
        contentType: f.contentType,
        path: `docs/pilotage/${f.relativePath}`,
      }));

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
            Fichiers Git sous <code className="text-xs">docs/pilotage/</code> ·
            lecture ADMIN · écriture SUPER_ADMIN · secrets masqués / refusés
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("overview")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "overview"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
            }`}
          >
            Vue synthèse
          </button>
          <button
            type="button"
            onClick={() => setTab("files")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "files"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
            }`}
          >
            Fichiers pilotage
          </button>
        </div>

        {tab === "overview" && (
          <div className="space-y-8">
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Vous êtes ici
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
                  <strong>TODOS_A_VALIDER.md</strong>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => {
                  setFileId("TODOS_A_VALIDER");
                  setTab("files");
                }}
                className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Ouvrir TODOS_A_VALIDER.md →
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
                    !canWrite ||
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

            {!canWrite && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Compte ADMIN : lecture seule. Passez SUPER_ADMIN pour éditer.
              </p>
            )}

            {loadingFile ? (
              <p className="text-sm text-gray-500">Chargement…</p>
            ) : (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                readOnly={!canWrite || !fileData?.writable}
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
