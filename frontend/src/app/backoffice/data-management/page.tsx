'use client'

import { useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { applicationService, companyService, contactService, authService, interviewService, followUpService, callService, eventService } from '@/lib/api'

export default function DataManagementPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'bulk'>('export')
  const [loading, setLoading] = useState(false)

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            💾 Gestion des Données
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Import, export et opérations en masse sur les données
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <TabButton
              active={activeTab === 'export'}
              onClick={() => setActiveTab('export')}
              icon="📤"
              label="Export"
            />
            <TabButton
              active={activeTab === 'import'}
              onClick={() => setActiveTab('import')}
              icon="📥"
              label="Import"
            />
            <TabButton
              active={activeTab === 'bulk'}
              onClick={() => setActiveTab('bulk')}
              icon="⚡"
              label="Opérations en masse"
            />
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'export' && <ExportPanel />}
        {activeTab === 'import' && <ImportPanel />}
        {activeTab === 'bulk' && <BulkOperationsPanel />}
      </div>
    </AdminLayout>
  )
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean
  onClick: () => void
  icon: string
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
        active
          ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function ExportPanel() {
  const handleExport = async (type: string) => {
    try {
      let data: any[] = []
      let filename = ''

      switch (type) {
        case 'applications':
          const appsResponse = await applicationService.getAll()
          data = appsResponse.data.applications || []
          filename = 'candidatures'
          break
        case 'companies':
          const companiesResponse = await companyService.getAll()
          data = companiesResponse.data.companies || []
          filename = 'entreprises'
          break
        case 'users':
          const usersResponse = await authService.getAllUsers()
          data = usersResponse.data.users || []
          filename = 'utilisateurs'
          break
        case 'contacts':
          const contactsResponse = await contactService.getAll()
          data = contactsResponse.data.contacts || []
          filename = 'contacts'
          break
        case 'interviews':
          const interviewsResponse = await interviewService.getAll()
          data = interviewsResponse.data.interviews || []
          filename = 'entretiens'
          break
        case 'followups':
          const followupsResponse = await followUpService.getAll()
          data = followupsResponse.data.followups || []
          filename = 'relances'
          break
        case 'calls':
          const callsResponse = await callService.getAll()
          data = callsResponse.data.calls || []
          filename = 'appels'
          break
        case 'events':
          const eventsResponse = await eventService.getAll()
          data = eventsResponse.data.events || []
          filename = 'evenements'
          break
      }

      // Créer et télécharger le fichier JSON
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert(`✅ Export de ${data.length} ${filename} réussi !`)
    } catch (error) {
      console.error('Erreur export:', error)
      alert('❌ Erreur lors de l\'export')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          💾 Export des données
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Exportez vos données au format JSON pour sauvegarde ou migration
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ExportCard
            icon="📝"
            title="Candidatures"
            description="Exporter toutes les candidatures"
            onClick={() => handleExport('applications')}
          />
          <ExportCard
            icon="🏢"
            title="Entreprises"
            description="Exporter toutes les entreprises"
            onClick={() => handleExport('companies')}
          />
          <ExportCard
            icon="👥"
            title="Utilisateurs"
            description="Exporter tous les utilisateurs"
            onClick={() => handleExport('users')}
          />
          <ExportCard
            icon="👤"
            title="Contacts"
            description="Exporter tous les contacts"
            onClick={() => handleExport('contacts')}
          />
          <ExportCard
            icon="🎯"
            title="Entretiens"
            description="Exporter tous les entretiens"
            onClick={() => handleExport('interviews')}
          />
          <ExportCard
            icon="🔔"
            title="Relances"
            description="Exporter toutes les relances"
            onClick={() => handleExport('followups')}
          />
          <ExportCard
            icon="📞"
            title="Appels"
            description="Exporter tous les appels"
            onClick={() => handleExport('calls')}
          />
          <ExportCard
            icon="📅"
            title="Événements"
            description="Exporter tous les événements"
            onClick={() => handleExport('events')}
          />
        </div>
      </div>

      {/* Export All */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              💾 Export complet
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Exporter toutes les données du système en un seul fichier
            </p>
          </div>
          <button
            onClick={() => alert('Export complet en cours...')}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
          >
            Exporter tout
          </button>
        </div>
      </div>
    </div>
  )
}

function ImportPanel() {
  const [file, setFile] = useState<File | null>(null)
  const [importType, setImportType] = useState('applications')

  const handleImport = async () => {
    if (!file) {
      alert('Veuillez sélectionner un fichier')
      return
    }

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      alert(`✅ Fichier lu: ${data.length} entrées trouvées\n\n⚠️ Fonction d'import à implémenter dans le backend`)
    } catch (error) {
      console.error('Erreur import:', error)
      alert('❌ Erreur lors de la lecture du fichier')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          📥 Importer des données
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Importez des données au format JSON (sauvegarde ou migration)
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type de données
            </label>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="applications">Candidatures</option>
              <option value="companies">Entreprises</option>
              <option value="users">Utilisateurs</option>
              <option value="contacts">Contacts</option>
              <option value="interviews">Entretiens</option>
              <option value="followups">Relances</option>
              <option value="calls">Appels</option>
              <option value="events">Événements</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fichier JSON
            </label>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>

          <button
            onClick={handleImport}
            disabled={!file}
            className="w-full px-4 py-3 bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50"
          >
            📥 Importer les données
          </button>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-yellow-900 dark:text-yellow-100">Attention</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              L'import de données peut écraser les données existantes. Assurez-vous d'avoir une sauvegarde avant de continuer.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BulkOperationsPanel() {
  const [selectedOperation, setSelectedOperation] = useState('')

  const operations = [
    {
      id: 'delete-inactive-users',
      title: 'Supprimer utilisateurs inactifs',
      description: 'Supprimer tous les utilisateurs inactifs depuis plus de 6 mois',
      danger: true
    },
    {
      id: 'archive-old-applications',
      title: 'Archiver vieilles candidatures',
      description: 'Archiver les candidatures de plus d\'un an',
      danger: false
    },
    {
      id: 'clean-duplicates',
      title: 'Nettoyer doublons',
      description: 'Rechercher et supprimer les entreprises en doublon',
      danger: true
    },
    {
      id: 'update-statuses',
      title: 'Mettre à jour statuts',
      description: 'Mettre à jour automatiquement les statuts obsolètes',
      danger: false
    },
  ]

  const executeOperation = (opId: string) => {
    if (confirm(`⚠️ Exécuter l'opération "${operations.find(o => o.id === opId)?.title}" ?\n\nCette action ne peut pas être annulée.`)) {
      alert(`Opération "${opId}" en cours...\n\n(Simulation - à implémenter dans le backend)`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          ⚡ Opérations en masse
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Exécutez des opérations sur plusieurs enregistrements à la fois
        </p>

        <div className="space-y-4">
          {operations.map((op) => (
            <div
              key={op.id}
              className={`p-4 border-2 rounded-lg ${
                op.danger
                  ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className={`font-semibold mb-1 ${
                    op.danger ? 'text-red-900 dark:text-red-100' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {op.danger && '⚠️ '}{op.title}
                  </h4>
                  <p className={`text-sm ${
                    op.danger ? 'text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {op.description}
                  </p>
                </div>
                <button
                  onClick={() => executeOperation(op.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    op.danger
                      ? 'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white'
                      : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white'
                  }`}
                >
                  Exécuter
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SQL Console (pour les super admins) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          🛠️ Console SQL (Super Admin uniquement)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Exécutez des requêtes SQL directement sur la base de données
        </p>

        <textarea
          rows={6}
          placeholder="SELECT * FROM users WHERE role = 'ADMIN';"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 font-mono text-sm mb-4"
        />

        <button
          onClick={() => alert('⚠️ Cette fonctionnalité est désactivée pour des raisons de sécurité')}
          className="px-4 py-2 bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg text-sm font-medium"
        >
          ▶️ Exécuter la requête
        </button>

        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ <strong>Attention:</strong> L'exécution de requêtes SQL directes peut endommager les données. Utilisez avec précaution.
          </p>
        </div>
      </div>
    </div>
  )
}

function ExportCard({ icon, title, description, onClick }: {
  icon: string
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
    >
      <div className="text-3xl mb-2">{icon}</div>
      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </button>
  )
}


