'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/features'
import { adminService } from '@/lib/api'

interface ArchivedItem {
  id: string
  type: 'Application' | 'Contact' | 'Company' | 'Interview' | 'FollowUp' | 'Call' | 'Event' | 'User'
  title: string
  archivedAt: string
  archivedBy?: string
  archivedReason?: string
  metadata?: any
}

export default function ArchivesManagementPage() {
  const [items, setItems] = useState<ArchivedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const entityTypes = [
    { value: 'all', label: 'Tous les éléments', icon: '📦' },
    { value: 'Application', label: 'Candidatures', icon: '📋' },
    { value: 'Contact', label: 'Contacts', icon: '👤' },
    { value: 'Company', label: 'Entreprises', icon: '🏢' },
    { value: 'Interview', label: 'Entretiens', icon: '🎤' },
    { value: 'FollowUp', label: 'Relances', icon: '📧' },
    { value: 'Call', label: 'Appels', icon: '📞' },
    { value: 'Event', label: 'Événements', icon: '📅' },
    { value: 'User', label: 'Utilisateurs', icon: '👥' }
  ]

  useEffect(() => {
    fetchArchivedItems()
  }, [selectedType])

  const fetchArchivedItems = async () => {
    setLoading(true)
    try {
      const response = await adminService.getArchived(
        selectedType !== 'all' ? selectedType : undefined
      )

      if (response.data.success) {
        setItems(response.data.items || [])
      }
    } catch (error) {
      console.error('Erreur récupération archives:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleUnarchive = async (item: ArchivedItem) => {
    const title = item.title || item.id || 'cet élément'
    if (!confirm(`Désarchiver "${title}" ?`)) return

    try {
      await adminService.unarchiveItem(item.type.toLowerCase(), item.id)
      fetchArchivedItems()
    } catch (error: any) {
      console.error('Erreur désarchivage:', error)
      alert(error.response?.data?.error || 'Erreur lors du désarchivage')
    }
  }

  const filteredItems = items.filter(item => {
    const title = (item.title || item.id || '').toLowerCase()
    if (searchQuery && !title.includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  const stats = {
    total: items.length,
    byType: items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">📦 Gestion des Archives</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Consulter et restaurer les éléments archivés
            </p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            title="Total archives"
            value={stats.total}
            icon="📦"
            color="blue"
          />
          <StatCard
            title="Cette semaine"
            value={items.filter(i => {
              const weekAgo = new Date()
              weekAgo.setDate(weekAgo.getDate() - 7)
              return new Date(i.archivedAt) > weekAgo
            }).length}
            icon="📅"
            color="purple"
          />
          <StatCard
            title="Ce mois-ci"
            value={items.filter(i => {
              const monthAgo = new Date()
              monthAgo.setMonth(monthAgo.getMonth() - 1)
              return new Date(i.archivedAt) > monthAgo
            }).length}
            icon="📊"
            color="green"
          />
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Recherche */}
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans les archives..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            {/* Filtres par type */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {entityTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedType === type.value
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="mr-2">{type.icon}</span>
                  {type.label}
                  {stats.byType[type.value] > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-white bg-opacity-20 dark:bg-black dark:bg-opacity-20 rounded-full text-xs">
                      {stats.byType[type.value]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Liste des éléments archivés */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Chargement des archives...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="text-4xl sm:text-6xl mb-4">📦</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {searchQuery ? 'Aucun résultat' : 'Aucune archive'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? 'Aucun élément ne correspond à votre recherche'
                  : 'Aucun élément archivé pour le moment'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => (
                <ArchivedItemRow
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onUnarchive={() => handleUnarchive(item)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 dark:text-blue-400 text-xl">ℹ️</span>
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-semibold mb-1">À propos des archives</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
                <li>Les éléments archivés sont conservés mais masqués des vues principales</li>
                <li>Vous pouvez désarchiver un élément à tout moment pour le rendre actif</li>
                <li>Les archives ne sont jamais supprimées automatiquement</li>
                <li>Idéal pour conserver l'historique sans encombrer l'interface</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function StatCard({ title, value, icon, color }: {
  title: string
  value: number
  icon: string
  color: 'blue' | 'green' | 'purple'
}) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
  }

  const textColors = {
    blue: 'text-blue-700 dark:text-blue-300',
    green: 'text-green-700 dark:text-green-300',
    purple: 'text-purple-700 dark:text-purple-300'
  }

  return (
    <div className={`${colors[color]} border rounded-lg p-4 sm:p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${textColors[color]}`}>{title}</p>
          <p className="text-2xl sm:text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100">{value}</p>
        </div>
        <div className="text-2xl sm:text-4xl">{icon}</div>
      </div>
    </div>
  )
}

function ArchivedItemRow({ item, onUnarchive }: {
  item: ArchivedItem
  onUnarchive: () => void
}) {
  const typeIcons: Record<string, string> = {
    Application: '📋',
    Contact: '👤',
    Company: '🏢',
    Interview: '🎤',
    FollowUp: '📧',
    Call: '📞',
    Event: '📅',
    User: '👥'
  }

  const typeColors: Record<string, string> = {
    Application: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    Contact: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    Company: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    Interview: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    FollowUp: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    Call: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
    Event: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
    User: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
  }

  const daysSinceArchived = Math.floor(
    (new Date().getTime() - new Date(item.archivedAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4 flex-1">
          {/* Type Badge */}
          <div className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium ${typeColors[item.type]}`}>
            <span className="mr-1">{typeIcons[item.type]}</span>
            {item.type}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{item.title || item.id || 'Sans titre'}</h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
              <span>Archivé il y a {daysSinceArchived} jour{daysSinceArchived > 1 ? 's' : ''}</span>
              {item.archivedBy && (
                <span className="flex items-center gap-1">
                  <span>👤</span>
                  <span>Par: {item.archivedBy}</span>
                </span>
              )}
              {item.archivedReason && (
                <span className="flex items-center gap-1" title={item.archivedReason}>
                  <span>📝</span>
                  <span className="truncate">
                    {item.archivedReason.length > 30
                      ? `${item.archivedReason.substring(0, 30)}...`
                      : item.archivedReason
                    }
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onUnarchive}
            className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <span>♻️</span>
            <span>Désarchiver</span>
          </button>
        </div>
      </div>
    </div>
  )
}
