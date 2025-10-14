'use client'

import { useState, useEffect } from 'react'
import { Edit, Trash2 } from 'lucide-react'
import AdminLayout from '@/components/AdminLayout'
import { AdvancedEditModal } from '@/components/AdvancedEditModal'
import { AdvancedDataExporter } from '@/components/AdvancedDataExporter'
import { useAuth } from '@/lib/auth'

interface Table {
  name: string
  count?: number
}

interface TableData {
  columns: string[]
  rows: any[]
  total: number
}

interface DBTest {
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  result?: string
  error?: string
  duration?: number
}

const TABLES = [
  { name: 'User', icon: '👤', description: 'Utilisateurs' },
  { name: 'Company', icon: '🏢', description: 'Entreprises' },
  { name: 'Application', icon: '📝', description: 'Candidatures' },
  { name: 'Contact', icon: '👥', description: 'Contacts' },
  { name: 'Interview', icon: '📅', description: 'Entretiens' },
  { name: 'Call', icon: '📞', description: 'Appels' },
  { name: 'FollowUp', icon: '📧', description: 'Relances' },
  { name: 'Notification', icon: '🔔', description: 'Notifications' },
  { name: 'EmailLog', icon: '📬', description: 'Logs Emails' },
  { name: 'Activity', icon: '📊', description: 'Activités' },
  { name: 'Document', icon: '📄', description: 'Documents' },
  { name: 'Reminder', icon: '⏰', description: 'Rappels' },
  { name: 'MessageTemplate', icon: '📋', description: 'Templates' },
]

export default function DataManagementPage() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState<'browse' | 'export' | 'import' | 'operations' | 'tests'>('browse')
  const [selectedTable, setSelectedTable] = useState<string>('User')
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRow, setEditingRow] = useState<any>(null)
  const [newRowData, setNewRowData] = useState<Record<string, any>>({})
  
  // Tests DB
  const [dbTests, setDbTests] = useState<DBTest[]>([
    { name: 'Connexion PostgreSQL', status: 'pending' },
    { name: 'Schéma Prisma Auth Service', status: 'pending' },
    { name: 'Schéma Prisma Application Service', status: 'pending' },
    { name: 'Schéma Prisma Call Service', status: 'pending' },
    { name: 'Schéma Prisma Notification Service', status: 'pending' },
    { name: 'Test Migration (dry-run)', status: 'pending' },
  ])
  const [runningDBTests, setRunningDBTests] = useState(false)

  useEffect(() => {
    if (token && selectedTable && activeTab === 'browse') {
      fetchTableData()
    }
  }, [token, selectedTable, page, activeTab])

  const fetchTableData = async () => {
    setLoading(true)
    try {
      // Appeler directement les endpoints des services selon la table
      let endpoint = ''
      let dataKey = ''
      
      switch (selectedTable) {
        case 'User':
          endpoint = 'http://localhost:8080/api/v1/auth/users'
          dataKey = 'users'
          break
        case 'Company':
          endpoint = `http://localhost:8080/api/v1/companies?page=${page}&limit=${limit}`
          dataKey = 'companies'
          break
        case 'Application':
          endpoint = `http://localhost:8080/api/v1/applications?page=${page}&limit=${limit}`
          dataKey = 'applications'
          break
        case 'Contact':
          endpoint = `http://localhost:8080/api/v1/contacts?page=${page}&limit=${limit}`
          dataKey = 'contacts'
          break
        case 'Interview':
          endpoint = `http://localhost:8080/api/v1/interviews?page=${page}&limit=${limit}`
          dataKey = 'interviews'
          break
        case 'Call':
          endpoint = `http://localhost:8080/api/v1/calls?page=${page}&limit=${limit}`
          dataKey = 'calls'
          break
        case 'FollowUp':
          endpoint = `http://localhost:8080/api/v1/followups?page=${page}&limit=${limit}`
          dataKey = 'followups'
          break
        case 'Notification':
          endpoint = `http://localhost:8080/api/v1/notifications?page=${page}&limit=${limit}`
          dataKey = 'notifications'
          break
        case 'EmailLog':
          endpoint = `http://localhost:8080/api/v1/notifications/emails/logs?page=${page}&limit=${limit}`
          dataKey = 'emailLogs'
          break
        case 'Activity':
          endpoint = `http://localhost:8080/api/v1/events?page=${page}&limit=${limit}`
          dataKey = 'events'
          break
        default:
          throw new Error(`Table ${selectedTable} non supportée`)
      }

      console.log('Fetching data from:', endpoint)

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const data = await response.json()
      console.log('Data received:', data)

      // Extraire les données selon le format de réponse
      const items = data[dataKey] || data.data || []
      
      if (items.length === 0) {
        console.log(`Aucune donnée trouvée pour la table ${selectedTable}`)
        setTableData({
          columns: [],
          rows: [],
          total: 0
        })
      } else {
        // Extraire les colonnes du premier élément
        const columns = Object.keys(items[0])
        
        console.log(`✅ ${items.length} enregistrements chargés pour ${selectedTable}`)
        console.log('Colonnes:', columns)
        
        setTableData({
          columns,
          rows: items,
          total: data.total || data.pagination?.total || items.length
        })
      }
    } catch (error: any) {
      console.error(`❌ Erreur chargement ${selectedTable}:`, error)
      const errorMsg = error.message || 'Erreur inconnue'
      
      // Afficher un message plus détaillé
      setTableData({
        columns: [],
        rows: [],
        total: 0
      })
      
      // Toast d'erreur au lieu d'une alerte bloquante
      console.error('Détails:', {
        table: selectedTable,
        error: errorMsg,
        response: error.response
      })
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (format: 'json' | 'csv') => {
    try {
      // Pour l'export, on récupère toutes les données sans pagination
      let endpoint = ''
      let dataKey = ''
      
      switch (selectedTable) {
        case 'User':
          endpoint = 'http://localhost:8080/api/v1/auth/users'
          dataKey = 'users'
          break
        case 'Company':
          endpoint = 'http://localhost:8080/api/v1/companies?limit=10000'
          dataKey = 'companies'
          break
        case 'Application':
          endpoint = 'http://localhost:8080/api/v1/applications?limit=10000'
          dataKey = 'applications'
          break
        case 'Contact':
          endpoint = 'http://localhost:8080/api/v1/contacts?limit=10000'
          dataKey = 'contacts'
          break
        case 'Call':
          endpoint = 'http://localhost:8080/api/v1/calls?limit=10000'
          dataKey = 'calls'
          break
        default:
          alert(`Export non supporté pour ${selectedTable}`)
          return
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'export')
      }

      const data = await response.json()
      const items = data[dataKey] || data.data || []

      if (items.length === 0) {
        alert('Aucune donnée à exporter')
        return
      }

      if (format === 'json') {
        // Export JSON
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
        a.download = `${selectedTable}_export_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
        window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
        alert(`✅ ${items.length} enregistrements exportés en JSON`)
      } else {
        // Export CSV
        const headers = Object.keys(items[0])
        const csv = [
          headers.join(','),
          ...items.map((item: any) => 
            headers.map(header => {
              const value = item[header]
              if (value === null || value === undefined) return ''
              if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
              return `"${String(value).replace(/"/g, '""')}"`
            }).join(',')
          )
        ].join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedTable}_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        alert(`✅ ${items.length} enregistrements exportés en CSV`)
      }
    } catch (error: any) {
      console.error('Erreur export:', error)
      alert(`❌ Erreur: ${error.message}`)
    }
  }

  const deleteRow = async (id: string) => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet enregistrement ?\n\nCette action est irréversible.')) return

    try {
      let endpoint = ''
      
      switch (selectedTable) {
        case 'User':
          endpoint = `http://localhost:8080/api/v1/auth/users/${id}`
          break
        case 'Company':
          endpoint = `http://localhost:8080/api/v1/companies/${id}`
          break
        case 'Application':
          endpoint = `http://localhost:8080/api/v1/applications/${id}`
          break
        case 'Contact':
          endpoint = `http://localhost:8080/api/v1/contacts/${id}`
          break
        case 'Interview':
          endpoint = `http://localhost:8080/api/v1/interviews/${id}`
          break
        case 'Call':
          endpoint = `http://localhost:8080/api/v1/calls/${id}`
          break
        case 'FollowUp':
          endpoint = `http://localhost:8080/api/v1/followups/${id}`
          break
        case 'Notification':
          endpoint = `http://localhost:8080/api/v1/notifications/${id}`
          break
        default:
          alert(`Suppression non supportée pour la table ${selectedTable}`)
      return
    }

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        alert('✅ Enregistrement supprimé avec succès')
        fetchTableData()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }
    } catch (error: any) {
      alert(`❌ Erreur: ${error.message}`)
    }
  }

  const bulkDelete = async () => {
    if (!confirm('⚠️ ATTENTION : Voulez-vous vraiment effectuer une suppression en masse ?')) return
    
    alert('Fonctionnalité de suppression en masse à implémenter avec sélection de lignes')
  }

  const renderCellValue = (value: any): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'boolean') return value ? '✓' : '✗'
    if (typeof value === 'object') return JSON.stringify(value)
    if (typeof value === 'string' && value.length > 50) return value.substring(0, 47) + '...'
    return String(value)
  }

  // Fonctions pour les Tests DB
  const runDBTests = async () => {
    setRunningDBTests(true)
    
    setDbTests(prev => prev.map(test => ({ ...test, status: 'pending' as const, result: undefined, error: undefined, duration: undefined })))

    // Test 1: Connexion PostgreSQL
    await runSingleTest(0, async () => {
      const response = await fetch('http://localhost:8080/api/v1/admin/test-db/connection', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Erreur HTTP: ' + response.status)
      return await response.json()
    })

    // Test 2-5: Schémas Prisma
    const services = ['auth', 'application', 'call', 'notification']
    for (let i = 0; i < services.length; i++) {
      await runSingleTest(i + 1, async () => {
        const response = await fetch(`http://localhost:8080/api/v1/admin/test-db/schema/${services[i]}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Erreur HTTP: ' + response.status)
        return await response.json()
      })
    }

    // Test 6: Migration dry-run
    await runSingleTest(5, async () => {
      const response = await fetch('http://localhost:8080/api/v1/admin/test-db/migration-test', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Erreur HTTP: ' + response.status)
      return await response.json()
    })

    setRunningDBTests(false)
  }

  const runSingleTest = async (index: number, testFn: () => Promise<any>) => {
    setDbTests(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], status: 'running' }
      return updated
    })

    const startTime = Date.now()
    
    try {
      const result = await testFn()
      const duration = Date.now() - startTime

      setDbTests(prev => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          status: 'success',
          result: result.message || result.details || 'OK',
          duration
        }
        return updated
      })
    } catch (error: any) {
      const duration = Date.now() - startTime
      
      setDbTests(prev => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          status: 'error',
          error: error.message || 'Erreur inconnue',
          duration
        }
        return updated
      })
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const runSingleDBTest = async (index: number) => {
    const testFunctions = [
      async () => {
        const response = await fetch('http://localhost:8080/api/v1/admin/test-db/connection', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Erreur HTTP: ' + response.status)
        return await response.json()
      },
      async () => {
        const response = await fetch('http://localhost:8080/api/v1/admin/test-db/schema/auth', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Erreur HTTP: ' + response.status)
        return await response.json()
      },
      async () => {
        const response = await fetch('http://localhost:8080/api/v1/admin/test-db/schema/application', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Erreur HTTP: ' + response.status)
        return await response.json()
      },
      async () => {
        const response = await fetch('http://localhost:8080/api/v1/admin/test-db/schema/call', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Erreur HTTP: ' + response.status)
        return await response.json()
      },
      async () => {
        const response = await fetch('http://localhost:8080/api/v1/admin/test-db/schema/notification', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Erreur HTTP: ' + response.status)
        return await response.json()
      },
      async () => {
        const response = await fetch('http://localhost:8080/api/v1/admin/test-db/migration-test', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) throw new Error('Erreur HTTP: ' + response.status)
        return await response.json()
      }
    ]

    await runSingleTest(index, testFunctions[index])
  }

  return (
    <AdminLayout>
    <div className="space-y-4 md:space-y-6">
        {/* Header - Responsive */}
        <div className="mb-4 md:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4 md:mb-6">
            {/* Titre avec boutons intégrés */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 break-words">
                    💾 Gestion des Données
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
                    Interface complète de gestion de base de données
                  </p>
                </div>

                {/* Boutons principaux intégrés au titre */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-3 sm:px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
                  >
                    ➕ Nouveau
                  </button>
                  <button
                    onClick={fetchTableData}
                    className="px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                  >
                    🔄 Rafraîchir
                  </button>
                  <AdvancedDataExporter
                    data={{
                      [selectedTable.toLowerCase()]: tableData?.rows || []
                    }}
                    className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 whitespace-nowrap"
                  >
                    📤 Exporter
                  </AdvancedDataExporter>
                  <button
                    onClick={() => {
                      // Tester l'exporteur avec les données fictives
                      const testData = {
                        user: [
                          { id: '1', email: 'redacted@example.invalid', firstName: 'Test', lastName: 'User', role: 'USER', is_active: true },
                          { id: '2', email: 'redacted@example.invalid', firstName: 'Admin', lastName: 'User', role: 'ADMIN', is_active: false }
                        ],
                        company: [
                          { id: '1', name: 'Test Company', sector: 'Tech', size: 'startup', is_active: true },
                          { id: '2', name: 'Another Company', sector: 'Finance', size: 'entreprise', is_active: true }
                        ]
                      }
                    }}
                    className="px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 whitespace-nowrap"
                  >
                    🧪 Test
                  </button>
                </div>
              </div>
            </div>
          </div>

        {/* Onglets - Scrollables sur mobile */}
        <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <nav className="-mb-px flex space-x-4 sm:space-x-6 md:space-x-8">
            {['browse', 'export', 'import', 'operations', 'tests'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 sm:py-3 md:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'browse' && '📊 Parcourir'}
                {tab === 'export' && '📤 Export'}
                {tab === 'import' && '📥 Import'}
                {tab === 'operations' && '⚙️ Opérations'}
                {tab === 'tests' && '🧪 Tests DB'}
              </button>
            ))}
          </nav>
        </div>

        {/* Onglet Parcourir */}
        {activeTab === 'browse' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
            {/* Sidebar - Liste des tables - Full width sur mobile */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 mb-3">Tables</h3>
                <div className="space-y-1">
                  {TABLES.map(table => (
                    <button
                      key={table.name}
                      onClick={() => {
                        setSelectedTable(table.name)
                        setPage(1)
                      }}
                      className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                        selectedTable === table.name
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="mr-1 sm:mr-2">{table.icon}</span>
                      {table.description}
                    </button>
                  ))}
                </div>
              </div>
          </div>

            {/* Contenu principal - Full width sur mobile */}
            <div className="lg:col-span-9 space-y-3 md:space-y-4">
              {/* Actions - Responsive */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    onClick={fetchTableData}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 whitespace-nowrap"
                  >
                    🔍 <span className="hidden sm:inline">Rechercher</span>
                  </button>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
                  >
                    ➕ Nouveau
                  </button>
                  <button
                    onClick={fetchTableData}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                  >
                    🔄 <span className="hidden sm:inline">Rafraîchir</span>
                  </button>
                  <div className="flex gap-2">
                    <AdvancedDataExporter
                      data={{
                        [selectedTable.toLowerCase()]: tableData?.rows || []
                      }}
                      className="flex-1 sm:flex-none"
                    />
                    {/* Bouton de test pour ajouter des données fictives */}
                    <button
                      onClick={() => {
                        // Ajouter des données de test pour vérifier l'exporteur
                        const testData = {
                          user: [
                            { id: '1', email: 'redacted@example.invalid', firstName: 'Test', lastName: 'User', role: 'USER', is_active: true },
                            { id: '2', email: 'redacted@example.invalid', firstName: 'Admin', lastName: 'User', role: 'ADMIN', is_active: false }
                          ],
                          company: [
                            { id: '1', name: 'Test Company', sector: 'Tech', size: 'startup', is_active: true },
                            { id: '2', name: 'Another Company', sector: 'Finance', size: 'entreprise', is_active: true }
                          ]
                        };

                        // Mettre à jour les données fictives pour tester
                        console.log('Données de test ajoutées:', testData);

                        // Tester l'exporteur avec les données fictives
                        if (window.testExportData) {
                          window.testExportData.data = testData;
                          console.log('Exporteur mis à jour avec données de test');
                        }
                      }}
                      className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 whitespace-nowrap"
                      title="Ajouter des données de test"
                    >
                      🧪 Test
                    </button>
                  </div>
                </div>
              </div>

              {/* Table de données - Responsive */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                      {TABLES.find(t => t.name === selectedTable)?.icon} Table : {selectedTable}
                    </h2>
                    {tableData && tableData.rows.length > 0 && (
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {tableData.total} enregistrement{tableData.total > 1 ? 's' : ''} • {tableData.columns.length} colonne{tableData.columns.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  {tableData && tableData.rows.length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Affichage de {((page - 1) * limit) + 1} à {Math.min(page * limit, tableData.total)} sur {tableData.total}
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des données...</p>
                  </div>
                ) : tableData && tableData.rows.length > 0 ? (
                <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-0">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs sm:text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          {tableData.columns.map(col => (
                            <th
                              key={col}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                            >
                              {col}
                            </th>
                          ))}
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {tableData.rows.map((row, idx) => (
                          <tr key={row.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            {tableData.columns.map(col => (
                              <td key={col} className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                <div className="max-w-xs truncate" title={renderCellValue(row[col])}>
                                  {renderCellValue(row[col])}
                                </div>
                              </td>
                            ))}
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => {
                                  setEditingRow(row)
                                  setShowEditModal(true)
                                }}
                                className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all duration-200 hover:scale-110 mr-2"
                                title="Éditer cet enregistrement"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteRow(row.id)}
                                className="h-8 w-8 rounded-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center transition-all duration-200 hover:scale-110"
                                title="Supprimer cet enregistrement"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-4xl mb-4">📭</div>
                    <p className="text-gray-500 dark:text-gray-400">
                      {tableData === null 
                        ? `Sélectionnez une table pour voir les données`
                        : `Aucune donnée dans la table ${selectedTable}`
                      }
                    </p>
                    {tableData !== null && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        ➕ Créer le premier enregistrement
                      </button>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {tableData && tableData.total > limit && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      Précédent
                    </button>
                    <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                      Page {page}
                    </span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page * limit >= tableData.total}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      Suivant
                    </button>
          </div>
                )}
        </div>
      </div>
    </div>
        )}

        {/* Onglet Export */}
        {activeTab === 'export' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span className="text-2xl">📤</span>
                  Export avancé des données
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Exportez vos données dans différents formats avec sélection précise
                </p>
              </div>
              <AdvancedDataExporter
                data={{
                  [selectedTable.toLowerCase()]: tableData?.rows || []
                }}
                className="ml-4"
              />
            </div>

            {/* Sélecteur de table pour l'export */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Table à prévisualiser
              </label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                {TABLES.map(table => (
                  <option key={table.name} value={table.name}>
                    {table.icon} {table.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Aperçu des données disponibles */}
            {tableData && tableData.rows.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  📊 Aperçu des données - {tableData.total} enregistrement{tableData.total > 1 ? 's' : ''}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {tableData.columns.length}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">Colonnes</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {Math.round(tableData.rows.length / 1024 * 100) / 100} KB
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">Taille estimée</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {new Set(tableData.rows.map(r => r.status)).size}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">Statuts uniques</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {tableData.rows.filter(r => r.is_active !== false).length}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">Éléments actifs</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Onglet Import */}
        {activeTab === 'import' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              📥 Importer des Données
            </h2>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".json,.csv"
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-gray-600 dark:text-gray-400"
                >
                  <div className="text-4xl mb-2">📁</div>
                  <p>Cliquez pour sélectionner un fichier</p>
                  <p className="text-sm mt-1">JSON ou CSV acceptés</p>
                </label>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Attention :</strong> L'import de données peut écraser des enregistrements existants. Assurez-vous d'avoir une sauvegarde.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Onglet Opérations */}
        {activeTab === 'operations' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              ⚙️ Opérations en Masse
            </h2>
            <div className="space-y-3">
              <button
                onClick={bulkDelete}
                className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-left"
              >
                🗑️ Suppression en masse
              </button>
              <button
                onClick={() => alert('Fonction à implémenter')}
                className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-left"
              >
                📝 Mise à jour en masse
              </button>
              <button
                onClick={() => alert('Fonction à implémenter')}
                className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-left"
              >
                🔄 Synchronisation des données
              </button>
            </div>
          </div>
        )}

        {/* Onglet Tests DB */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    🧪 Tests de Base de Données
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Vérification de la connexion PostgreSQL, des schémas Prisma et des migrations
                  </p>
                </div>
                <button
                  onClick={runDBTests}
                  disabled={runningDBTests}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50"
                >
                  {runningDBTests ? '🔄 Tests en cours...' : '▶️ Lancer tous les tests'}
                </button>
              </div>

              <div className="space-y-3">
                {dbTests.map((test, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      test.status === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : test.status === 'error'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : test.status === 'running'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl">
                          {test.status === 'success' && '✅'}
                          {test.status === 'error' && '❌'}
                          {test.status === 'running' && <span className="animate-spin">🔄</span>}
                          {test.status === 'pending' && '⏳'}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {test.name}
                          </div>
                          {test.result && (
                            <div className="text-sm text-green-700 dark:text-green-400 mt-1">
                              ✓ {test.result}
                            </div>
                          )}
                          {test.error && (
                            <div className="text-sm text-red-700 dark:text-red-400 mt-1">
                              ✗ {test.error}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {test.duration && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {test.duration}ms
                          </div>
                        )}
                        <button
                          onClick={() => runSingleDBTest(index)}
                          disabled={test.status === 'running' || runningDBTests}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            test.status === 'running' || runningDBTests
                              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                          }`}
                          title="Relancer ce test uniquement"
                        >
                          {test.status === 'running' ? '⏳' : '▶️'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>Note :</strong> Ces tests vérifient que la base de données et tous les schémas Prisma sont correctement configurés. Cliquez sur "▶️ Lancer tous les tests" pour une vérification complète, ou sur le bouton ▶️ de chaque test pour le lancer individuellement.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Créer */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              ➕ Créer un enregistrement - {selectedTable}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Fonctionnalité à implémenter : formulaire dynamique basé sur le schéma de la table
            </p>
            <div className="flex justify-end gap-2">
        <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
        >
                Fermer
        </button>
        </div>
      </div>
    </div>
      )}

      {/* Modal Éditer avancée */}
      <AdvancedEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        rowData={editingRow}
        tableName={selectedTable}
        onSave={async (updatedData) => {
          // Implémenter la logique de sauvegarde
          let endpoint = '';

          switch (selectedTable) {
            case 'User':
              endpoint = `http://localhost:8080/api/v1/auth/users/${updatedData.id}`;
              break;
            case 'Company':
              endpoint = `http://localhost:8080/api/v1/companies/${updatedData.id}`;
              break;
            case 'Application':
              endpoint = `http://localhost:8080/api/v1/applications/${updatedData.id}`;
              break;
            case 'Contact':
              endpoint = `http://localhost:8080/api/v1/contacts/${updatedData.id}`;
              break;
            case 'Interview':
              endpoint = `http://localhost:8080/api/v1/interviews/${updatedData.id}`;
              break;
            case 'Call':
              endpoint = `http://localhost:8080/api/v1/calls/${updatedData.id}`;
              break;
            case 'FollowUp':
              endpoint = `http://localhost:8080/api/v1/followups/${updatedData.id}`;
              break;
            case 'Notification':
              endpoint = `http://localhost:8080/api/v1/notifications/${updatedData.id}`;
              break;
            default:
              throw new Error(`Table ${selectedTable} non supportée pour la modification`);
          }

          const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
          });

          if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
          }

          const result = await response.json();
          alert('✅ Enregistrement modifié avec succès');
          fetchTableData(); // Recharger les données
        }}
      />
    </div>
    </AdminLayout>
  )
}
