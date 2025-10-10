'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { adminService } from '@/lib/api'

interface ArchivedItem {
  id: string
  type: 'Application' | 'Contact' | 'Company' | 'Interview' | 'FollowUp' | 'Call' | 'Event' | 'User'
  title: string
  archivedAt: string
  archivedBy?: string
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
    if (!confirm(`Désarchiver "${item.title}" ?`)) return

    try {
      await adminService.unarchiveItem(item.type.toLowerCase(), item.id)
      fetchArchivedItems()
    } catch (error) {
      console.error('Erreur désarchivage:', error)
      alert('Erreur lors du désarchivage')
    }
  }

  const filteredItems = items.filter(item => {
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
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
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📦 Archives</h1>
            <p className="text-gray-600 mt-2">
              Consulter et gérer les éléments archivés
            </p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans les archives..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtres par type */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {entityTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    selectedType === type.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-2">{type.icon}</span>
                  {type.label}
                  {stats.byType[type.value] > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-white bg-opacity-20 rounded-full text-xs">
                      {stats.byType[type.value]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Liste des éléments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Chargement...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchQuery ? 'Aucun résultat' : 'Aucune archive'}
              </h3>
              <p className="text-gray-500">
                {searchQuery 
                  ? 'Aucun élément ne correspond à votre recherche'
                  : 'Aucun élément archivé pour le moment'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredItems.map(item => (
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
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 text-xl">ℹ️</span>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">À propos des archives</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
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
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200'
  }

  const textColors = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    purple: 'text-purple-700'
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
    Application: 'bg-blue-100 text-blue-800',
    Contact: 'bg-purple-100 text-purple-800',
    Company: 'bg-orange-100 text-orange-800',
    Interview: 'bg-green-100 text-green-800',
    FollowUp: 'bg-yellow-100 text-yellow-800',
    Call: 'bg-pink-100 text-pink-800',
    Event: 'bg-indigo-100 text-indigo-800',
    User: 'bg-red-100 text-red-800'
  }

  const daysSinceArchived = Math.floor(
    (new Date().getTime() - new Date(item.archivedAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Type Badge */}
          <div className={`px-3 py-1 rounded-lg text-sm font-medium ${typeColors[item.type]}`}>
            <span className="mr-1">{typeIcons[item.type]}</span>
            {item.type}
          </div>

          {/* Infos */}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{item.title}</h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <span>Archivé il y a {daysSinceArchived} jour{daysSinceArchived > 1 ? 's' : ''}</span>
              {item.archivedBy && (
                <span className="flex items-center gap-1">
                  <span>👤</span>
                  <span>Par: Admin</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onUnarchive}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>📤</span>
            <span>Désarchiver</span>
          </button>
        </div>
      </div>
    </div>
  )
}

