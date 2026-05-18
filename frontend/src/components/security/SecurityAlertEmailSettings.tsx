"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, Mail, Save, Loader2 } from "lucide-react";
import axios from "axios";
import { FRONTEND_URLS } from "@/config/ports.config";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Switch } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { Badge } from "@/components/ui";

const API_URL = FRONTEND_URLS.api;

type SettingsPayload = {
  enabled: boolean;
  recipients: string[];
  levels: string[];
  source?: string;
  updatedAt?: string | null;
};

export function SecurityAlertEmailSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>(["critical", "high"]);
  const [source, setSource] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_URL}/api/v1/security/notification-settings`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data: SettingsPayload = res.data?.data || {};
      setEnabled(Boolean(data.enabled));
      setRecipients(Array.isArray(data.recipients) ? data.recipients : []);
      setLevels(
        Array.isArray(data.levels) && data.levels.length > 0
          ? data.levels
          : ["critical", "high"],
      );
      setSource(String(data.source || ""));
    } catch (e: unknown) {
      setError(
        axios.isAxiosError(e)
          ? e.response?.data?.error || e.message
          : "Chargement impossible",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addEmail = () => {
    const e = emailInput.trim();
    if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError("Adresse email invalide");
      return;
    }
    if (!recipients.includes(e)) {
      setRecipients((prev) => [...prev, e]);
    }
    setEmailInput("");
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${API_URL}/api/v1/security/notification-settings`,
        { enabled, recipients, levels },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data?.success) {
        setMessage("Paramètres enregistrés. Les prochaines alertes utiliseront cette configuration.");
        setSource("file");
        await load();
      }
    } catch (e: unknown) {
      setError(
        axios.isAxiosError(e)
          ? e.response?.data?.error || e.message
          : "Échec de l'enregistrement",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleLevel = (level: string) => {
    setLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement alertes sécurité…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 dark:border-red-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
          <Shield className="h-5 w-5" />
          Alertes email — menaces &amp; disponibilité
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Destinataires pour les alertes <strong>critical</strong> /{" "}
          <strong>high</strong> (menaces réseau, CVE, service down). En l&apos;absence
          d&apos;adresse ici, repli sur{" "}
          <code className="text-xs">SECURITY_ALERT_EMAIL</code> ou{" "}
          <code className="text-xs">CRASH_REPORT_EMAIL</code> du{" "}
          <code className="text-xs">.env</code>.
          {source && (
            <Badge variant="outline" className="ml-2">
              source: {source}
            </Badge>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Envoi email activé</Label>
            <p className="text-xs text-gray-500">
              Désactiver stoppe les envois (alertes restent en base).
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label>Niveaux notifiés par email</Label>
          <div className="flex flex-wrap gap-2">
            {["critical", "high", "medium", "low"].map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => toggleLevel(lv)}
                className={`rounded-md px-3 py-1 text-sm border ${
                  levels.includes(lv)
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                }`}
              >
                {lv}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            Destinataires
          </Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="redacted@example.invalid"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEmail()}
            />
            <Button type="button" variant="outline" onClick={addEmail}>
              Ajouter
            </Button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {recipients.map((r) => (
              <li
                key={r}
                className="flex items-center gap-1 rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-sm"
              >
                {r}
                <button
                  type="button"
                  className="text-red-600 hover:underline text-xs"
                  onClick={() =>
                    setRecipients((prev) => prev.filter((x) => x !== r))
                  }
                >
                  retirer
                </button>
              </li>
            ))}
          </ul>
          {recipients.length === 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Aucun destinataire — configurez au moins une adresse pour recevoir les
              rapports.
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {message && (
          <p className="text-sm text-green-700 dark:text-green-300">{message}</p>
        )}

        <Button
          onClick={save}
          disabled={saving}
          className="bg-red-600 hover:bg-red-700"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Enregistrer les alertes sécurité
        </Button>
        <p className="text-xs text-gray-500">
          La réauthentification obligatoire avant modification sera ajoutée dans une
          prochaine itération (voir checklist porteur).
        </p>
      </CardContent>
    </Card>
  );
}

