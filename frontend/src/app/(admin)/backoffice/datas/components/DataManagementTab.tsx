"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/auth";
import { FRONTEND_URLS } from "@/config/ports.config";
import {
  Download,
  Upload,
  Database,
  Trash2,
  AlertTriangle,
  CheckCircle,
  FileDown,
  FileUp,
  FileText,
  Building2,
  Users,
  Calendar,
  Phone,
  Mail,
  Bell,
} from "lucide-react";
import axios from "axios";
import { statisticsService } from "@/lib/services/statisticsService";

const API_URL = FRONTEND_URLS.api;

interface DataStats {
  applications: number;
  companies: number;
  contacts: number;
  users: number;
}

export default function DataManagementTab() {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DataStats>({
    applications: 0,
    companies: 0,
    contacts: 0,
    users: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const statistics = await statisticsService.getCurrentStatistics();
        if (statistics) {
          setStats({
            applications: statistics.applications?.total ?? 0,
            companies: statistics.companies?.total ?? 0,
            contacts: statistics.contacts?.total ?? 0,
            users: statistics.users?.total ?? 0,
          });
        } else {
          setStats({ applications: 0, companies: 0, contacts: 0, users: 0 });
        }
      } catch {
        setStats({ applications: 0, companies: 0, contacts: 0, users: 0 });
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  const handleExport = async (type: string) => {
    try {
      setLoading(true);
      setMessage(null);

      const response = await axios.get(
        `${API_URL}/api/v1/admin/export/${type}`,
        {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `export-${type}-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage({ type: "success", text: `Export ${type} réussi !` });
    } catch (error: any) {
      console.error("Erreur export:", error);
      const msg =
        error.response?.status === 501
          ? "Export non disponible (route à brancher)."
          : error.response?.data?.error ||
            `Erreur lors de l'export ${type}. Vérifiez que l\'API Gateway (port 5002) est démarrée.`;
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setMessage({ type: "error", text: "Veuillez sélectionner un fichier" });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      await axios.post(`${API_URL}/api/v1/admin/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage({ type: "success", text: "Import réussi !" });
      setSelectedFile(null);
    } catch (error: any) {
      console.error("Erreur import:", error);
      const msg =
        error.response?.status === 501
          ? "Import non implémenté côté gateway (à brancher sur les services métier)."
          : error.response?.data?.error ||
            "Erreur lors de l'import. Vérifiez que l'API Gateway (port 5002) est démarrée.";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async (days: number) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer les données de plus de ${days} jours ?`,
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      await axios.post(
        `${API_URL}/api/v1/admin/cleanup`,
        { days },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMessage({ type: "success", text: `Nettoyage effectué avec succès` });
    } catch (error: any) {
      console.error("Erreur nettoyage:", error);
      const msg =
        error.response?.status === 501
          ? "Nettoyage non implémenté (à définir : service, tables, rétention)."
          : error.response?.data?.error || "Erreur lors du nettoyage.";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <FileDown className="h-6 w-6 text-blue-600" />
            Exporter les données
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Exportez vos données au format JSON pour sauvegarde ou analyse
          </p>
          <div className="space-y-2">
            <button
              onClick={() => handleExport("applications")}
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exporter les candidatures
            </button>
            <button
              onClick={() => handleExport("companies")}
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exporter les entreprises
            </button>
            <button
              onClick={() => handleExport("contacts")}
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exporter les contacts
            </button>
            <button
              onClick={() => handleExport("all")}
              disabled={loading}
              className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              <Database className="h-4 w-4" />
              Exporter tout
            </button>
          </div>
        </div>

        {/* Import */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <FileUp className="h-6 w-6 text-green-600" />
            Importer des données
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Importez des données depuis un fichier JSON ou CSV
          </p>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <input
                type="file"
                accept=".json,.csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full"
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Fichier sélectionné: {selectedFile.name}
                </p>
              )}
            </div>
            <button
              onClick={handleImport}
              disabled={loading || !selectedFile}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Importer
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Database className="h-6 w-6 text-purple-600" />
          Statistiques de la base de données
        </h2>
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Candidatures
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.applications}
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Entreprises
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.companies}
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Contacts
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.contacts}
              </p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Utilisateurs
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.users}
              </p>
            </div>
          </div>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          Accédez aux listes détaillées via les onglets ci-dessus ou les liens
          ci-dessous.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { tab: "applications", label: "Candidatures", icon: FileText },
            { tab: "companies", label: "Entreprises", icon: Building2 },
            { tab: "contacts", label: "Contacts", icon: Users },
            { tab: "interviews", label: "Entretiens", icon: Calendar },
            { tab: "calls", label: "Appels", icon: Phone },
            { tab: "followups", label: "Relances", icon: Mail },
            { tab: "events", label: "Événements", icon: Calendar },
            { tab: "notifications", label: "Notifications", icon: Bell },
          ].map(({ tab, label, icon: Icon }) => (
            <button
              key={tab}
              type="button"
              onClick={() => router.push(`/backoffice/datas?tab=${tab}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" />
          Zone Dangereuse
        </h2>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">
          Ces actions sont irréversibles. Assurez-vous d'avoir une sauvegarde
          avant de continuer.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCleanup(90)}
            disabled={loading}
            className="py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Nettoyer données &gt; 90 jours
          </button>
          <button
            onClick={() => handleCleanup(365)}
            disabled={loading}
            className="py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Nettoyer données &gt; 1 an
          </button>
        </div>
      </div>
    </div>
  );
}
