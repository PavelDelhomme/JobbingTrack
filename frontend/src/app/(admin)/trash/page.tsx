"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/features";
import { adminService } from "@/lib/api";

interface DeletedItem {
  id: string;
  type:
    | "Application"
    | "Contact"
    | "Company"
    | "Interview"
    | "FollowUp"
    | "Call"
    | "Event"
    | "User";
  title: string;
  deletedAt: string;
  deletedBy?: string;
  adminDeletedAt?: string;
  canRestore: boolean;
  metadata?: any;
}

export default function TrashManagementPage() {
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const entityTypes = [
    { value: "all", label: "Tous les éléments", icon: "🗑️" },
    { value: "Application", label: "Candidatures", icon: "📋" },
    { value: "Contact", label: "Contacts", icon: "👤" },
    { value: "Company", label: "Entreprises", icon: "🏢" },
    { value: "Interview", label: "Entretiens", icon: "🎤" },
    { value: "FollowUp", label: "Relances", icon: "📧" },
    { value: "Call", label: "Appels", icon: "📞" },
    { value: "Event", label: "Événements", icon: "📅" },
    { value: "User", label: "Utilisateurs", icon: "👥" },
  ];

  useEffect(() => {
    fetchDeletedItems();
  }, [selectedType]);

  const fetchDeletedItems = async () => {
    setLoading(true);
    try {
      const response = await adminService.getTrash(
        selectedType !== "all" ? selectedType : undefined,
      );

      if (response.data.success) {
        setItems(response.data.items || []);
      }
    } catch (error) {
      console.error("Erreur récupération corbeille:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: DeletedItem) => {
    if (!confirm(`Restaurer "${item.title}" ?`)) return;

    try {
      await adminService.restoreItem(item.type.toLowerCase(), item.id);
      fetchDeletedItems();
    } catch (error) {
      console.error("Erreur restauration:", error);
      alert("Erreur lors de la restauration");
    }
  };

  const handlePermanentDelete = async (item: DeletedItem) => {
    if (
      !confirm(
        `⚠️ ATTENTION ⚠️\n\nVoulez-vous supprimer DÉFINITIVEMENT "${item.title}" ?\n\nCette action est IRRÉVERSIBLE !`,
      )
    )
      return;

    try {
      await adminService.permanentDelete(item.type.toLowerCase(), item.id);
      fetchDeletedItems();
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Erreur lors de la suppression définitive");
    }
  };

  const handleEmptyTrash = async () => {
    if (
      !confirm(
        `⚠️ DANGER ⚠️\n\nVoulez-vous vider TOUTE la corbeille ?\n\nCette action supprimera DÉFINITIVEMENT tous les éléments supprimés il y a plus de 30 jours.\n\nCette action est IRRÉVERSIBLE !`,
      )
    )
      return;

    try {
      await adminService.emptyTrash();
      fetchDeletedItems();
    } catch (error) {
      console.error("Erreur vidage corbeille:", error);
      alert("Erreur lors du vidage de la corbeille");
    }
  };

  const filteredItems = items.filter((item) => {
    if (
      searchQuery &&
      !item.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const stats = {
    total: items.length,
    restorable: items.filter((i) => i.canRestore).length,
    permanent: items.filter((i) => !i.canRestore).length,
    byType: items.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              🗑️ Gestion de la Corbeille
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Gérer et restaurer les éléments supprimés
            </p>
          </div>

          <button
            onClick={handleEmptyTrash}
            className="px-6 py-3 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <span>🗑️</span>
            <span>Vider la corbeille</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total archives"
            value={stats.total}
            icon="🗑️"
            color="blue"
          />
          <StatCard
            title="Cette semaine"
            value={stats.restorable}
            icon="♻️"
            color="purple"
          />
          <StatCard
            title="Ce mois-ci"
            value={
              items.filter((i) => {
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return new Date(i.deletedAt) > monthAgo;
              }).length
            }
            icon="📊"
            color="green"
          />
        </div>

        {/* Statistiques */}
        {/*<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total éléments"
            value={stats.total}
            icon="🗑️"
            color="gray"
          />
          <StatCard
            title="Restaurables"
            value={stats.restorable}
            icon="♻️"
            color="green"
          />
          <StatCard
            title="Permanents"
            value={stats.permanent}
            icon="⚠️"
            color="red"
          />
        </div>*/}

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans la corbeille..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            {/* Filtres par type */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {entityTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    selectedType === type.value
                      ? "bg-blue-600 dark:bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  <span className="mr-2">{type.icon}</span>
                  {type.label}
                  {stats.byType[type.value] > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-white dark:bg-gray-800 bg-opacity-20 dark:bg-opacity-20 rounded-full text-xs">
                      {stats.byType[type.value]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Liste des éléments */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Chargement...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🗑️</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchQuery ? "Aucun résultat" : "Corbeille vide"}
              </h3>
              <p className="text-gray-500">
                {searchQuery
                  ? "Aucun élément ne correspond à votre recherche"
                  : "Aucun élément supprimé pour le moment"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <DeletedItemRow
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onRestore={() => handleRestore(item)}
                  onPermanentDelete={() => handlePermanentDelete(item)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-700">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 text-xl">ℹ️</span>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">À propos de la corbeille</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>
                  Les éléments marqués comme restaurables peuvent être récupérés
                </li>
                <li>
                  Les éléments supprimés par un admin peuvent avoir des
                  restrictions
                </li>
                <li>
                  Les éléments dans la corbeille depuis plus de 30 jours sont
                  automatiquement supprimés
                </li>
                <li>La suppression définitive est IRRÉVERSIBLE</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: "blue" | "green" | "purple";
}) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    green:
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    purple:
      "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  };

  const textColors = {
    blue: "text-blue-700 dark:text-blue-300",
    green: "text-green-700 dark:text-green-300",
    purple: "text-purple-700 dark:text-purple-300",
  };

  return (
    <div className={`${colors[color]} border rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${textColors[color]}`}>{title}</p>
          <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100">
            {value}
          </p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}
/*
function StatCard({ title, value, icon, color }: {
  title: string
  value: number
  icon: string
  color: 'gray' | 'green' | 'red'
}) {
  const colors = {
    gray: 'bg-gray-50 border-gray-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200'
  }

  const textColors = {
    gray: 'text-gray-700',
    green: 'text-green-700',
    red: 'text-red-700'
  }

  return (
    <div className={`${colors[color]} border rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${textColors[color]}`}>{title}</p>
          <p className="text-3xl font-bold mt-2 text-gray-900">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )
}*/

function DeletedItemRow({
  item,
  onRestore,
  onPermanentDelete,
}: {
  item: DeletedItem;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const typeIcons: Record<string, string> = {
    Application: "📋",
    Contact: "👤",
    Company: "🏢",
    Interview: "🎤",
    FollowUp: "📧",
    Call: "📞",
    Event: "📅",
    User: "👥",
  };

  const typeColors: Record<string, string> = {
    Application:
      "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
    Contact:
      "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200",
    Company:
      "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
    Interview:
      "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
    FollowUp:
      "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
    Call: "bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200",
    Event:
      "bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200",
    User: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
  };

  const daysSinceDeleted = Math.floor(
    (new Date().getTime() - new Date(item.deletedAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <div className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Type Badge */}
          <div
            className={`px-3 py-1 rounded-lg text-sm font-medium ${typeColors[item.type]}`}
          >
            <span className="mr-1">{typeIcons[item.type]}</span>
            {item.type}
          </div>

          {/* Infos */}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {item.title}
            </h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
              <span>
                Supprimé il y a {daysSinceDeleted} jour
                {daysSinceDeleted > 1 ? "s" : ""}
              </span>
              {item.deletedBy && (
                <span className="flex items-center gap-1">
                  <span>👤</span>
                  <span>Par: Admin</span>
                </span>
              )}
              {item.adminDeletedAt && (
                <span className="flex items-center gap-1">
                  <span>⚠️</span>
                  <span>Suppression admin</span>
                </span>
              )}
            </div>
          </div>

          {/* Statut restauration */}
          <div className="text-center">
            {item.canRestore ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                <span>♻️</span>
                <span>Restaurable</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm font-medium">
                <span>🔒</span>
                <span>Non restaurable</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {item.canRestore && (
            <button
              onClick={onRestore}
              className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <span>♻️</span>
              <span>Restaurer</span>
            </button>
          )}

          <button
            onClick={onPermanentDelete}
            className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <span>🗑️</span>
            <span>Supprimer définitivement</span>
          </button>
        </div>
      </div>

      {/* Alerte si proche de la suppression auto */}
      {daysSinceDeleted >= 25 && daysSinceDeleted < 30 && (
        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Cet élément sera automatiquement supprimé définitivement dans{" "}
            {30 - daysSinceDeleted} jour{30 - daysSinceDeleted > 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
