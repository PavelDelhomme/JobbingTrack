"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/features";
import {
  Search,
  Filter,
  Download,
  TrendingUp,
  Clock,
  AlertCircle,
  Zap,
  X,
  FileText,
  Building2,
  Users,
  Calendar,
  Phone,
  Loader2,
  ChevronRight,
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { FRONTEND_URLS } from "@/config/ports.config";

const API_URL = FRONTEND_URLS.api;

/** Neutralise les payloads XSS dans le texte affiché (ex. onerror=, onload=) sans casser la recherche. */
function sanitizeDisplayQuery(q: string): string {
  if (!q || typeof q !== "string") return q;
  return q
    .replace(/\bonerror\s*=/gi, "")
    .replace(/\bonload\s*=/gi, "")
    .replace(/\bon\w+\s*=/gi, "");
}

interface SearchResult {
  module: string;
  results: any[];
  total: number;
  error?: string;
  success?: boolean;
}

const MODULE_CONFIG = {
  applications: {
    icon: FileText,
    label: "Candidatures",
    color: "blue",
    fields: ["title", "companyName", "status"],
    link: (id: string) => `/b4ck0ff1ce/applications`,
  },
  companies: {
    icon: Building2,
    label: "Entreprises",
    color: "purple",
    fields: ["name", "sector", "location"],
    link: (id: string) => `/b4ck0ff1ce/companies`,
  },
  contacts: {
    icon: Users,
    label: "Contacts",
    color: "green",
    fields: ["firstName", "lastName", "email", "position"],
    link: (id: string) => `/b4ck0ff1ce/contacts`,
  },
  interviews: {
    icon: Calendar,
    label: "Entretiens",
    color: "orange",
    fields: ["type", "status", "scheduledAt"],
    link: (id: string) => `/b4ck0ff1ce/interviews`,
  },
  calls: {
    icon: Phone,
    label: "Appels",
    color: "pink",
    fields: ["title", "status", "scheduledAt"],
    link: (id: string) => `/b4ck0ff1ce/calls`,
  },
};

export default function OptimizedSearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "applications",
    "companies",
    "contacts",
    "interviews",
    "calls",
  ]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Charger l'historique de recherche
  useEffect(() => {
    const stored = localStorage.getItem("searchHistory");
    if (stored) {
      try {
        setSearchHistory(JSON.parse(stored));
      } catch (e) {
        console.error("Erreur chargement historique:", e);
      }
    }
  }, []);

  // Fonction de recherche
  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) {
      setError("Veuillez entrer au moins 2 caractères");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/api/v1/search`, {
        params: {
          query: searchQuery,
          modules: selectedModules.join(","),
          limit: 20,
        },
      });

      if (response.data.success) {
        setResults(response.data.results || []);

        // Ajouter à l'historique
        const newHistory = [
          searchQuery,
          ...searchHistory.filter((q) => q !== searchQuery),
        ].slice(0, 10);
        setSearchHistory(newHistory);
        localStorage.setItem("searchHistory", JSON.stringify(newHistory));
      } else {
        setError("Erreur lors de la recherche");
      }
    } catch (err: any) {
      console.error("Erreur recherche:", err);
      setError(err.response?.data?.error || "Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  // Recherche lors de l'appui sur Entrée
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Toggle module selection
  const toggleModule = (module: string) => {
    if (selectedModules.includes(module)) {
      setSelectedModules(selectedModules.filter((m) => m !== module));
    } else {
      setSelectedModules([...selectedModules, module]);
    }
  };

  // Export results
  const exportResults = () => {
    const allResults = results.flatMap((r) =>
      (r.results || []).map((item) => ({
        module: r.module,
        ...item,
      })),
    );

    const csvContent = [
      ["Module", "ID", "Données"].join(","),
      ...allResults.map((result) =>
        [
          result.module,
          result.id || "",
          JSON.stringify(result).replace(/"/g, '""'),
        ]
          .map((field) => `"${field}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recherche-${searchQuery}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalResults = results.reduce((sum, r) => sum + (r.total || 0), 0);
  const hasResults = results.some((r) => r.results && r.results.length > 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Zap className="h-8 w-8 text-blue-600" />
              Recherche Optimisée
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
              Recherche intelligente dans tous vos modules
            </p>
          </div>
          {hasResults && (
            <button
              onClick={exportResults}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-5 w-5" />
              Exporter CSV
            </button>
          )}
        </div>

        {/* Barre de recherche */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={sanitizeDisplayQuery(searchQuery)}
                onChange={(e) =>
                  setSearchQuery(sanitizeDisplayQuery(e.target.value))
                }
                onKeyPress={handleKeyPress}
                placeholder="Rechercher... (min. 2 caractères)"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 text-base"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || searchQuery.length < 2}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Rechercher
                </>
              )}
            </button>
          </div>

          {/* Historique de recherche */}
          {searchHistory.length > 0 && !searchQuery && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Recherches récentes :
              </p>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchQuery(query)}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Clock className="h-3 w-3 inline mr-1" />
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filtres de modules */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Modules à rechercher :
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(MODULE_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const isSelected = selectedModules.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleModule(key)}
                  className={`px-3 py-2 rounded-lg border transition-all ${
                    isSelected
                      ? `bg-${config.color}-100 border-${config.color}-300 text-${config.color}-700 dark:bg-${config.color}-900/30 dark:border-${config.color}-700 dark:text-${config.color}-400`
                      : "bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                  }`}
                >
                  <Icon className="h-4 w-4 inline mr-1" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Résultats */}
        {hasResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {totalResults} résultat{totalResults > 1 ? "s" : ""} trouvé
                {totalResults > 1 ? "s" : ""}
              </h2>
            </div>

            {results.map((moduleResults) => {
              if (!moduleResults.results || moduleResults.results.length === 0)
                return null;

              const config =
                MODULE_CONFIG[
                  moduleResults.module as keyof typeof MODULE_CONFIG
                ];
              if (!config) return null;

              const Icon = config.icon;

              return (
                <div
                  key={moduleResults.module}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div
                    className={`bg-${config.color}-50 dark:bg-${config.color}-900/20 border-b border-${config.color}-200 dark:border-${config.color}-800 px-6 py-3`}
                  >
                    <h3
                      className={`text-base font-medium text-${config.color}-900 dark:text-${config.color}-100 flex items-center gap-2`}
                    >
                      <Icon className="h-5 w-5" />
                      {config.label}
                      <span className="ml-2 px-2 py-0.5 text-xs bg-white dark:bg-gray-800 rounded-full">
                        {moduleResults.total}
                      </span>
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {moduleResults.results.slice(0, 5).map((result, index) => (
                      <Link
                        key={index}
                        href={config.link(result.id)}
                        className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {result.title ||
                                  result.name ||
                                  `${result.firstName || ""} ${result.lastName || ""}`.trim() ||
                                  "Sans titre"}
                              </p>
                              {result.status && (
                                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                                  {result.status}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {result.companyName ||
                                result.email ||
                                result.sector ||
                                result.type ||
                                "Détails non disponibles"}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                        </div>
                      </Link>
                    ))}
                    {moduleResults.total > 5 && (
                      <Link
                        href={config.link("")}
                        className="block px-6 py-3 text-center text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        Voir tous les {moduleResults.total} résultats →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Message si aucun résultat */}
        {!loading &&
          !hasResults &&
          searchQuery.length >= 2 &&
          results.length > 0 && (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Aucun résultat trouvé
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Essayez avec d'autres mots-clés ou sélectionnez d'autres modules
              </p>
            </div>
          )}

        {/* Informations sur l'optimisation */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Fonctionnalités de recherche
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Zap className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Recherche multi-modules
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Recherchez dans tous vos modules simultanément
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Filter className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Filtres intelligents
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Sélectionnez les modules à rechercher
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Historique
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Accédez à vos recherches récentes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
