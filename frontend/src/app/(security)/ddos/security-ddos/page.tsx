"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/features";
import { useAuth } from "@/lib/hooks/auth";
import { FRONTEND_URLS } from "@/config/ports.config";
import axios from "axios";

const API_URL = FRONTEND_URLS.api;

interface DDoSAttack {
  id: string;
  timestamp: string;
  sourceIPs: string[];
  countries: string[];
  attackType: string;
  targetEndpoint: string;
  duration: number;
  totalRequests: number;
  requestsPerSecond: number;
  isMitigated: boolean;
  mitigationTime?: number;
  metadata?: any;
}

export default function SecurityDDoSPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attacks, setAttacks] = useState<DDoSAttack[]>([]);
  const [filteredAttacks, setFilteredAttacks] = useState<DDoSAttack[]>([]);
  const [filters, setFilters] = useState({
    attackType: "",
    mitigated: "",
    search: "",
  });

  useEffect(() => {
    if (token) {
      loadDDoSAttacks();
    }
  }, [token]);

  useEffect(() => {
    applyFilters();
  }, [attacks, filters]);

  const loadDDoSAttacks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/v1/ddos`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setAttacks(response.data.data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des attaques DDoS:", error);

      // Fallback vers des données mockées
      const mockAttacks = Array.from({ length: 25 }, (_, i) => ({
        id: `ddos-${i}`,
        timestamp: new Date(
          Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        sourceIPs: Array.from(
          { length: Math.floor(Math.random() * 20) + 1 },
          () =>
            `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        ),
        countries: [
          ["CN", "RU", "US", "BR", "IN", "KR"][Math.floor(Math.random() * 6)],
        ],
        attackType: ["VOLUMETRIC", "PROTOCOL", "APPLICATION"][
          Math.floor(Math.random() * 3)
        ],
        targetEndpoint: `/api/v1/${["auth", "dashboard", "applications", "companies"][Math.floor(Math.random() * 4)]}`,
        duration: Math.floor(Math.random() * 3600) + 60, // 1 minute à 1 heure
        totalRequests: Math.floor(Math.random() * 100000) + 1000,
        requestsPerSecond: Math.floor(Math.random() * 1000) + 100,
        isMitigated: Math.random() > 0.3,
        mitigationTime:
          Math.random() > 0.5
            ? Math.floor(Math.random() * 300) + 30
            : undefined,
        metadata: {
          bandwidth: `${Math.floor(Math.random() * 100) + 10}Gbps`,
          packetsPerSecond: Math.floor(Math.random() * 1000000) + 100000,
          attackVector: ["SYN Flood", "UDP Flood", "HTTP Flood", "Slowloris"][
            Math.floor(Math.random() * 4)
          ],
        },
      }));

      setAttacks(mockAttacks);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...attacks];

    if (filters.attackType) {
      filtered = filtered.filter(
        (attack) => attack.attackType === filters.attackType,
      );
    }

    if (filters.mitigated !== "") {
      const mitigated = filters.mitigated === "true";
      filtered = filtered.filter((attack) => attack.isMitigated === mitigated);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(
        (attack) =>
          attack.targetEndpoint.toLowerCase().includes(searchTerm) ||
          attack.countries.some((country) =>
            country.toLowerCase().includes(searchTerm),
          ) ||
          attack.sourceIPs.some((ip) => ip.toLowerCase().includes(searchTerm)),
      );
    }

    setFilteredAttacks(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      attackType: "",
      mitigated: "",
      search: "",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getAttackTypeColor = (attackType: string) => {
    switch (attackType) {
      case "VOLUMETRIC":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "PROTOCOL":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "APPLICATION":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getCountryFlag = (country: string) => {
    const flags: { [key: string]: string } = {
      US: "🇺🇸",
      CN: "🇨🇳",
      RU: "🇷🇺",
      FR: "🇫🇷",
      DE: "🇩🇪",
      BR: "🇧🇷",
      JP: "🇯🇵",
      KR: "🇰🇷",
      IN: "🇮🇳",
      GB: "🇬🇧",
    };
    return flags[country] || "🌍";
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            🌐 Attaques DDoS
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Surveillance et analyse des attaques par déni de service distribué
            (DDoS)
          </p>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type d'attaque
              </label>
              <select
                value={filters.attackType}
                onChange={(e) =>
                  handleFilterChange("attackType", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Tous les types</option>
                <option value="VOLUMETRIC">Volumétrique</option>
                <option value="PROTOCOL">Protocole</option>
                <option value="APPLICATION">Application</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Statut
              </label>
              <select
                value={filters.mitigated}
                onChange={(e) =>
                  handleFilterChange("mitigated", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Tous les statuts</option>
                <option value="true">Mitigées</option>
                <option value="false">En cours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Actions
              </label>
              <div className="flex gap-2">
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Effacer
                </button>
                <button
                  onClick={loadDDoSAttacks}
                  className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Actualiser
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Rechercher par endpoint, pays, IP..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Statistiques */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredAttacks.length} attaques affichées sur {attacks.length}{" "}
              total
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-red-600 dark:text-red-400">
                {
                  filteredAttacks.filter((a) => a.attackType === "VOLUMETRIC")
                    .length
                }{" "}
                volumétriques
              </span>
              <span className="text-orange-600 dark:text-orange-400">
                {
                  filteredAttacks.filter((a) => a.attackType === "PROTOCOL")
                    .length
                }{" "}
                protocole
              </span>
              <span className="text-purple-600 dark:text-purple-400">
                {
                  filteredAttacks.filter((a) => a.attackType === "APPLICATION")
                    .length
                }{" "}
                application
              </span>
              <span className="text-green-600 dark:text-green-400">
                {filteredAttacks.filter((a) => a.isMitigated).length} mitigées
              </span>
            </div>
          </div>
        </div>

        {/* Liste des attaques DDoS */}
        <div className="space-y-4">
          {filteredAttacks.length > 0 ? (
            filteredAttacks.map((attack) => (
              <div
                key={attack.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 text-sm rounded-full font-medium ${getAttackTypeColor(attack.attackType)}`}
                    >
                      {attack.attackType}
                    </span>
                    {attack.isMitigated ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        MITIGÉE
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        EN COURS
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(attack.timestamp)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="text-sm">
                    <strong className="text-gray-900 dark:text-gray-100">
                      Cible:
                    </strong>
                    <div className="font-mono text-xs mt-1">
                      {attack.targetEndpoint}
                    </div>
                  </div>

                  <div className="text-sm">
                    <strong className="text-gray-900 dark:text-gray-100">
                      Durée:
                    </strong>
                    <div className="mt-1">
                      {formatDuration(attack.duration)}
                    </div>
                  </div>

                  <div className="text-sm">
                    <strong className="text-gray-900 dark:text-gray-100">
                      Requêtes:
                    </strong>
                    <div className="mt-1">
                      {attack.totalRequests.toLocaleString()} total
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {attack.requestsPerSecond.toLocaleString()}/sec
                      </div>
                    </div>
                  </div>

                  <div className="text-sm">
                    <strong className="text-gray-900 dark:text-gray-100">
                      Sources:
                    </strong>
                    <div className="mt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs">
                          {attack.sourceIPs.length} IPs
                        </span>
                        {attack.countries.map((country) => (
                          <span
                            key={country}
                            className="text-lg"
                            title={country}
                          >
                            {getCountryFlag(country)}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {attack.countries.join(", ")}
                      </div>
                    </div>
                  </div>
                </div>

                {attack.mitigationTime && (
                  <div className="text-sm text-green-600 dark:text-green-400 mb-4">
                    ⏱️ Mitigation en {attack.mitigationTime} secondes
                  </div>
                )}

                {attack.metadata && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <strong className="text-gray-900 dark:text-gray-100">
                        Bande passante:
                      </strong>
                      <div className="text-gray-600 dark:text-gray-400">
                        {attack.metadata.bandwidth}
                      </div>
                    </div>
                    <div>
                      <strong className="text-gray-900 dark:text-gray-100">
                        Paquets/sec:
                      </strong>
                      <div className="text-gray-600 dark:text-gray-400">
                        {attack.metadata.packetsPerSecond.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <strong className="text-gray-900 dark:text-gray-100">
                        Vecteur:
                      </strong>
                      <div className="text-gray-600 dark:text-gray-400">
                        {attack.metadata.attackVector}
                      </div>
                    </div>
                  </div>
                )}

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                    Voir les IPs sources ({attack.sourceIPs.length})
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs font-mono">
                      {attack.sourceIPs.map((ip, index) => (
                        <div
                          key={index}
                          className="text-gray-900 dark:text-gray-100"
                        >
                          {ip}
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            ))
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 01-1.414-1.414L6.586 13H9a1 1 0 010 2H7a1 1 0 01-1-1V5a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H9a1 1 0 010-2h2.414l1.293 1.293a1 1 0 001.414-1.414L12.414 11H15a2 2 0 002-2V5a2 2 0 00-2-2H5z"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">
                Aucune attaque DDoS trouvée avec les critères actuels
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
