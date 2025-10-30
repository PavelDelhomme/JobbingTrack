'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/features'
import { adminService, authService } from '@/lib/api'

interface GenerationConfig {
  users: number
  companies: number
  applications: number
  contacts: number
  interviews: number
  followups: number
  calls: number
  events: number
  deletedItems: number
  archivedItems: number
}

interface GenerationOptions {
  users: boolean
  companies: boolean
  applications: boolean
  contacts: boolean
  interviews: boolean
  followups: boolean
  calls: boolean
  events: boolean
  deletedItems: boolean
  archivedItems: boolean
}

interface UserSelection {
  selectedUsers: string[]
  generateForAllUsers: boolean
}

interface User {
  id: string
  email: string
  role: string
  firstName?: string
  lastName?: string
}

export default function TestDataGeneratorPage() {
  const [config, setConfig] = useState<GenerationConfig>({
    users: 3,
    companies: 10,
    applications: 20,
    contacts: 15,
    interviews: 8,
    followups: 12,
    calls: 10,
    events: 20,
    deletedItems: 5,
    archivedItems: 3
  })

  const [options, setOptions] = useState<GenerationOptions>({
    users: true,
    companies: true,
    applications: true,
    contacts: true,
    interviews: true,
    followups: true,
    calls: true,
    events: true,
    deletedItems: true,
    archivedItems: true
  })

  const [userSelection, setUserSelection] = useState<UserSelection>({
    selectedUsers: [],
    generateForAllUsers: true
  })

  const [availableUsers, setAvailableUsers] = useState<User[]>([])

  const [generating, setGenerating] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [output, setOutput] = useState<string>('')
  const [showOutput, setShowOutput] = useState(false)

  const handleGenerate = async () => {
    // Vérifier qu'au moins une option est sélectionnée
    const enabledOptions = Object.values(options).filter(Boolean)
    if (enabledOptions.length === 0) {
      alert('❌ Veuillez sélectionner au moins un type de données à générer.')
      return
    }

    // Construire la liste des données à générer
    const dataToGenerate = Object.entries(options)
      .filter(([_, enabled]) => enabled)
      .map(([key, _]) => {
        const count = config[key as keyof GenerationConfig]
        return `${count} ${getLabelForKey(key)}`
      })
      .join('\n')

    if (!confirm(
      `⚠️ ATTENTION ⚠️\n\nVoulez-vous générer ces données de test ?\n\nCela va créer:\n${dataToGenerate}\n\n` +
      `${userSelection.generateForAllUsers ? 'Pour TOUS les utilisateurs' : `Pour ${userSelection.selectedUsers.length} utilisateur(s) sélectionné(s)`}`
    )) return

    setGenerating(true)
    setOutput('')
    setShowOutput(true)

    try {
      const generationData = {
        config,
        options,
        userSelection
      }

      const response = await adminService.generateTestData(generationData)

      if (response.data.success) {
        setOutput(response.data.output || 'Données générées avec succès !')
        alert('✅ Données de test générées avec succès !')
      }
    } catch (error: any) {
      console.error('Erreur génération:', error)
      setOutput(`❌ Erreur: ${error.response?.data?.error || error.message}`)
      alert('Erreur lors de la génération des données')
    } finally {
      setGenerating(false)
    }
  }

  const getLabelForKey = (key: string): string => {
    const labels: Record<string, string> = {
      users: 'utilisateurs',
      companies: 'entreprises',
      applications: 'candidatures',
      contacts: 'contacts',
      interviews: 'entretiens',
      followups: 'relances',
      calls: 'appels',
      events: 'événements',
      deletedItems: 'éléments supprimés',
      archivedItems: 'éléments archivés'
    }
    return labels[key] || key
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await authService.getAllUsers()
      if (response.data.success && response.data.users) {
        setAvailableUsers(response.data.users.map((u: any) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          firstName: u.firstName,
          lastName: u.lastName
        })))
      }
    } catch (error) {
      console.error('Erreur récupération utilisateurs:', error)
      // Fallback sur des utilisateurs par défaut en cas d'erreur
      setAvailableUsers([
        { id: '1', email: 'user1@jobbingtrack.test', role: 'SUPER_ADMIN', firstName: 'Admin', lastName: 'JobbingTrack' },
        { id: '2', email: 'user2@jobbingtrack.test', role: 'ADMIN', firstName: 'Marie', lastName: 'Martin' },
        { id: '3', email: 'user3@jobbingtrack.test', role: 'USER', firstName: 'Thomas', lastName: 'Bernard' }
      ])
    }
  }

  // Charger les utilisateurs au montage du composant
  useEffect(() => {
    fetchAvailableUsers()
  }, [])

  const handleClear = async () => {
    if (!confirm(
      `⚠️ DANGER ⚠️\n\nVoulez-vous SUPPRIMER TOUTES LES DONNÉES DE TEST ?\n\n` +
      `Cela supprimera DÉFINITIVEMENT:\n` +
      `- Toutes les candidatures\n` +
      `- Tous les entretiens\n` +
      `- Toutes les relances\n` +
      `- Tous les appels\n` +
      `- Tous les contacts\n` +
      `- Toutes les entreprises\n` +
      `- Toutes les activités\n\n` +
      `⚠️ CETTE ACTION EST IRRÉVERSIBLE ⚠️\n\n` +
      `Êtes-vous ABSOLUMENT SÛR ?`
    )) return

    setClearing(true)

    try {
      await adminService.clearTestData()
      alert('✅ Données de test supprimées')
      setOutput('')
    } catch (error: any) {
      console.error('Erreur nettoyage:', error)
      alert('Erreur lors du nettoyage des données')
    } finally {
      setClearing(false)
    }
  }

  const presets = [
    {
      name: 'Tests E2E',
      description: 'Données minimales pour tests end-to-end',
      icon: '🧪',
      config: {
        users: 4,
        companies: 8,
        applications: 12,
        contacts: 10,
        interviews: 4,
        followups: 6,
        calls: 4,
        events: 8,
        deletedItems: 2,
        archivedItems: 2
      }
    },
    {
      name: 'Tests API',
      description: 'Données pour tests des endpoints API',
      icon: '🌐',
      config: {
        users: 3,
        companies: 6,
        applications: 15,
        contacts: 8,
        interviews: 3,
        followups: 5,
        calls: 3,
        events: 6,
        deletedItems: 1,
        archivedItems: 1
      }
    },
    {
      name: 'Tests Performance',
      description: 'Beaucoup de données pour tests de charge',
      icon: '⚡',
      config: {
        users: 5,
        companies: 25,
        applications: 100,
        contacts: 50,
        interviews: 15,
        followups: 25,
        calls: 20,
        events: 40,
        deletedItems: 5,
        archivedItems: 5
      }
    },
    {
      name: 'Tests Sécurité',
      description: 'Données variées pour tests de sécurité',
      icon: '🔒',
      config: {
        users: 6,
        companies: 12,
        applications: 30,
        contacts: 20,
        interviews: 8,
        followups: 12,
        calls: 8,
        events: 15,
        deletedItems: 3,
        archivedItems: 3
      }
    },
    {
      name: 'Tests Mobile',
      description: 'Données optimisées pour tests mobile',
      icon: '📱',
      config: {
        users: 3,
        companies: 10,
        applications: 20,
        contacts: 12,
        interviews: 5,
        followups: 8,
        calls: 5,
        events: 10,
        deletedItems: 2,
        archivedItems: 2
      }
    },
    {
      name: 'Tests Complets',
      description: 'Suite complète pour validation finale',
      icon: '🎯',
      config: {
        users: 8,
        companies: 20,
        applications: 50,
        contacts: 35,
        interviews: 15,
        followups: 25,
        calls: 15,
        events: 30,
        deletedItems: 5,
        archivedItems: 5
      }
    }
  ]

  const totalItems = Object.values(config).reduce((sum, val) => sum + val, 0)

  return (
    <AdminLayout>
      <div>
        {/* Header - Responsive */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 break-words">🎲 Générateur de Données de Test</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">
            Générez des données réalistes et cohérentes pour tester l'application
          </p>
        </div>

        {/* Warning Banner - Responsive */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-3 sm:p-4 mb-4 sm:mb-6 md:mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 dark:text-yellow-500 text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Attention - Environnement de développement uniquement
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>Cette fonctionnalité est destinée aux environnements de développement et staging.</p>
                <p className="mt-1">Ne jamais utiliser en production !</p>
              </div>
            </div>
          </div>
        </div>

        {/* Presets - Responsive */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">📋 Configurations prédéfinies</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {presets.map(preset => (
              <button
                key={preset.name}
                onClick={() => setConfig(preset.config)}
                className="text-left p-3 sm:p-4 md:p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all"
              >
                <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">{preset.icon}</div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 mb-1">{preset.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 line-clamp-2">{preset.description}</p>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                  {Object.values(preset.config).reduce((sum, val) => sum + val, 0)} éléments au total
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sélection des types de données - Responsive */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6 mb-4 md:mb-8">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 md:mb-6">🎯 Sélection des données à générer</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
            {Object.entries(options).map(([key, enabled]) => (
              <label key={key} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {key === 'users' ? '👥' :
                       key === 'companies' ? '🏢' :
                       key === 'applications' ? '📋' :
                       key === 'contacts' ? '👤' :
                       key === 'interviews' ? '🎤' :
                       key === 'followups' ? '📧' :
                       key === 'calls' ? '📞' :
                       key === 'events' ? '📅' :
                       key === 'deletedItems' ? '🗑️' : '📦'}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {getLabelForKey(key)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {config[key as keyof GenerationConfig]} éléments
                  </p>
                </div>
              </label>
            ))}
          </div>

          {/* Sélection des utilisateurs */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4 md:pt-6">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">👤 Sélection des utilisateurs</h3>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3 md:mb-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={userSelection.generateForAllUsers}
                  onChange={() => setUserSelection({ selectedUsers: [], generateForAllUsers: true })}
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <span className="text-gray-900 dark:text-gray-100 font-medium">Tous les utilisateurs</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={!userSelection.generateForAllUsers}
                  onChange={() => setUserSelection({ ...userSelection, generateForAllUsers: false })}
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <span className="text-gray-900 dark:text-gray-100 font-medium">Utilisateurs spécifiques</span>
              </label>
            </div>

            {!userSelection.generateForAllUsers && (
              <div>
                {availableUsers.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <div className="text-4xl mb-2">⏳</div>
                      <p>Chargement des utilisateurs...</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableUsers.map((user) => (
                      <label key={user.id} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userSelection.selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                          setUserSelection({
                            ...userSelection,
                            selectedUsers: [...userSelection.selectedUsers, user.id]
                          })
                        } else {
                          setUserSelection({
                            ...userSelection,
                            selectedUsers: userSelection.selectedUsers.filter(id => id !== user.id)
                          })
                        }
                      }}
                      className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email} • {user.role}
                      </p>
                    </div>
                  </label>
                ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Configuration personnalisée - Responsive */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6 mb-4 md:mb-8">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 md:mb-6">⚙️ Configuration personnalisée</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <ConfigSlider
              label="Utilisateurs"
              value={config.users}
              onChange={(val) => setConfig({ ...config, users: val })}
              min={1}
              max={10}
              icon="👥"
            />
            
            <ConfigSlider
              label="Entreprises"
              value={config.companies}
              onChange={(val) => setConfig({ ...config, companies: val })}
              min={5}
              max={30}
              icon="🏢"
            />
            
            <ConfigSlider
              label="Candidatures"
              value={config.applications}
              onChange={(val) => setConfig({ ...config, applications: val })}
              min={5}
              max={100}
              icon="📋"
            />
            
            <ConfigSlider
              label="Contacts"
              value={config.contacts}
              onChange={(val) => setConfig({ ...config, contacts: val })}
              min={5}
              max={50}
              icon="👤"
            />
            
            <ConfigSlider
              label="Entretiens"
              value={config.interviews}
              onChange={(val) => setConfig({ ...config, interviews: val })}
              min={0}
              max={50}
              icon="🎤"
            />
            
            <ConfigSlider
              label="Relances"
              value={config.followups}
              onChange={(val) => setConfig({ ...config, followups: val })}
              min={0}
              max={50}
              icon="📧"
            />
            
            <ConfigSlider
              label="Appels"
              value={config.calls}
              onChange={(val) => setConfig({ ...config, calls: val })}
              min={0}
              max={50}
              icon="📞"
            />
            
            <ConfigSlider
              label="Événements"
              value={config.events}
              onChange={(val) => setConfig({ ...config, events: val })}
              min={0}
              max={100}
              icon="📅"
            />
            
            <ConfigSlider
              label="Éléments supprimés"
              value={config.deletedItems}
              onChange={(val) => setConfig({ ...config, deletedItems: val })}
              min={0}
              max={20}
              icon="🗑️"
            />
            
            <ConfigSlider
              label="Éléments archivés"
              value={config.archivedItems}
              onChange={(val) => setConfig({ ...config, archivedItems: val })}
              min={0}
              max={20}
              icon="📦"
            />
          </div>

          {/* Résumé - Responsive */}
          <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total d'éléments à générer</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{totalItems}</p>
              </div>
              <div className="text-gray-400 dark:text-gray-500 text-4xl sm:text-5xl md:text-6xl">🎲</div>
            </div>
          </div>
        </div>

        {/* Actions avec tests automatiques - Empilés verticalement sur mobile */}
        <div className="space-y-3 sm:space-y-4 mb-4 md:mb-8">
          {/* Génération principale */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                  <span className="text-sm sm:text-base">Génération en cours...</span>
                </>
              ) : (
                <>
                  <span className="text-xl sm:text-2xl">🎲</span>
                  <span className="text-sm sm:text-base font-semibold">Générer les données de test</span>
                </>
              )}
            </button>

            <button
              onClick={handleClear}
              disabled={clearing || generating}
              className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3 whitespace-nowrap"
            >
              {clearing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                  <span className="text-sm sm:text-base">Nettoyage...</span>
                </>
              ) : (
                <>
                  <span className="text-lg sm:text-xl">🗑️</span>
                  <span className="text-sm sm:text-base">Tout supprimer</span>
                </>
              )}
            </button>
          </div>

          {/* Tests automatiques */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">🧪 Tests automatiques après génération</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              <button
                onClick={() => window.open('/backoffice/playwright-tests', '_blank')}
                className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left"
              >
                <div className="text-lg sm:text-xl mb-1">🧪</div>
                <div className="text-sm font-medium text-green-900 dark:text-green-100">Tests E2E</div>
                <div className="text-xs text-green-700 dark:text-green-300">Playwright</div>
              </button>

              <button
                onClick={() => {
                  // Exécuter les tests API
                  fetch('/api/test/run-api-tests')
                    .then(() => alert('Tests API lancés !'))
                    .catch(() => alert('Erreur lors du lancement des tests API'))
                }}
                className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
              >
                <div className="text-lg sm:text-xl mb-1">🌐</div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Tests API</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">Endpoints</div>
              </button>

              <button
                onClick={() => {
                  // Exécuter les tests de performance
                  fetch('/api/test/run-performance-tests')
                    .then(() => alert('Tests de performance lancés !'))
                    .catch(() => alert('Erreur lors du lancement des tests de performance'))
                }}
                className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left"
              >
                <div className="text-lg sm:text-xl mb-1">⚡</div>
                <div className="text-sm font-medium text-purple-900 dark:text-purple-100">Performance</div>
                <div className="text-xs text-purple-700 dark:text-purple-300">Charge & Speed</div>
              </button>

              <button
                onClick={() => {
                  // Exécuter les tests de sécurité
                  fetch('/api/test/run-security-tests')
                    .then(() => alert('Tests de sécurité lancés !'))
                    .catch(() => alert('Erreur lors du lancement des tests de sécurité'))
                }}
                className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-left"
              >
                <div className="text-lg sm:text-xl mb-1">🔒</div>
                <div className="text-sm font-medium text-red-900 dark:text-red-100">Sécurité</div>
                <div className="text-xs text-red-700 dark:text-red-300">Vulnérabilités</div>
              </button>

              <button
                onClick={() => {
                  // Exécuter les tests mobile
                  fetch('/api/test/run-mobile-tests')
                    .then(() => alert('Tests mobile lancés !'))
                    .catch(() => alert('Erreur lors du lancement des tests mobile'))
                }}
                className="p-3 sm:p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-left"
              >
                <div className="text-lg sm:text-xl mb-1">📱</div>
                <div className="text-sm font-medium text-orange-900 dark:text-orange-100">Mobile</div>
                <div className="text-xs text-orange-700 dark:text-orange-300">Responsive</div>
              </button>

              <button
                onClick={() => {
                  // Lancer tous les tests
                  fetch('/api/test/run-all-tests')
                    .then(() => alert('Suite complète de tests lancée !'))
                    .catch(() => alert('Erreur lors du lancement de la suite de tests'))
                }}
                className="p-3 sm:p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-left"
              >
                <div className="text-lg sm:text-xl mb-1">🚀</div>
                <div className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Suite complète</div>
                <div className="text-xs text-indigo-700 dark:text-indigo-300">Tous les tests</div>
              </button>
            </div>
          </div>

          {/* Génération automatique au démarrage */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">🔄 Génération automatique</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={async () => {
                  try {
                    await adminService.generateTestData({
                      config: { users: 3, companies: 8, applications: 15, contacts: 10, interviews: 5, followups: 8, calls: 5, events: 10, deletedItems: 2, archivedItems: 2 },
                      options: { users: true, companies: true, applications: true, contacts: true, interviews: true, followups: true, calls: true, events: true, deletedItems: true, archivedItems: true },
                      userSelection: { generateForAllUsers: true, selectedUsers: [] }
                    })
                    alert('✅ Données de test par défaut générées !')
                  } catch (error) {
                    alert('❌ Erreur lors de la génération automatique')
                  }
                }}
                className="px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm"
              >
                🎲 Générer données par défaut
              </button>

              <button
                onClick={async () => {
                  try {
                    await adminService.generateTestData({
                      config: { users: 4, companies: 8, applications: 12, contacts: 10, interviews: 4, followups: 6, calls: 4, events: 8, deletedItems: 2, archivedItems: 2 },
                      options: { users: true, companies: true, applications: true, contacts: true, interviews: true, followups: true, calls: true, events: true, deletedItems: true, archivedItems: true },
                      userSelection: { generateForAllUsers: true, selectedUsers: [] }
                    })
                    setTimeout(() => {
                      window.open('/backoffice/playwright-tests', '_blank')
                    }, 1000)
                    alert('✅ Données E2E générées + Tests lancés !')
                  } catch (error) {
                    alert('❌ Erreur lors de la génération E2E')
                  }
                }}
                className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm"
              >
                🧪 Générer + Tests E2E
              </button>
            </div>
          </div>
        </div>

        {/* Output - Responsive */}
        {showOutput && (
          <div className="bg-gray-900 dark:bg-gray-800 text-green-400 dark:text-green-300 rounded-lg p-3 sm:p-4 md:p-6 font-mono text-xs sm:text-sm overflow-auto max-h-64 sm:max-h-80 md:max-h-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white dark:text-gray-100">📋 Résultat de la génération</h3>
              <button
                onClick={() => setShowOutput(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-100"
              >
                ✕
              </button>
            </div>
            <pre className="whitespace-pre-wrap">{output || 'Génération en cours...'}</pre>
          </div>
        )}

        {/* Info - Responsive */}
        <div className="mt-4 sm:mt-6 md:mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 sm:p-4 md:p-6">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 dark:text-blue-400 text-2xl">ℹ️</span>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-100 mb-2">Comment utiliser le générateur</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                <li className="flex items-start gap-2">
                  <span>1️⃣</span>
                  <span><strong>Choisissez un preset</strong> ou personnalisez la configuration avec les sliders</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>2️⃣</span>
                  <span><strong>Cliquez sur "Générer"</strong> pour créer les données (peut prendre quelques secondes)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>3️⃣</span>
                  <span><strong>Les données générées</strong> incluent des relations cohérentes entre les entités</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>4️⃣</span>
                  <span><strong>Les comptes de test</strong> sont créés avec le mot de passe : <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-blue-800 dark:text-blue-200">password123</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span>5️⃣</span>
                  <span><strong>Utilisez "Tout supprimer"</strong> pour nettoyer complètement la base de données</span>
                </li>
              </ul>

              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-blue-200 dark:border-blue-700">
                <h4 className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">🎯 Données générées</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-blue-700 dark:text-blue-300">
                  <div>✅ Utilisateurs avec différents rôles (USER, ADMIN, SUPER_ADMIN)</div>
                  <div>✅ Entreprises réalistes (Google, Microsoft, etc.)</div>
                  <div>✅ Candidatures avec différents statuts</div>
                  <div>✅ Contacts liés aux entreprises</div>
                  <div>✅ Entretiens planifiés et passés</div>
                  <div>✅ Relances complétées et en attente</div>
                  <div>✅ Appels entrants et sortants</div>
                  <div>✅ Liaisons Application-Contact</div>
                  <div>✅ Activités et historique</div>
                  <div>✅ Éléments en corbeille</div>
                  <div>✅ Éléments archivés</div>
                  <div>✅ Données cohérentes et liées</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exemples de comptes - Responsive */}
        <div className="mt-4 sm:mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 sm:p-4 md:p-6">
          <h3 className="text-sm sm:text-base font-semibold text-green-900 dark:text-green-100 mb-3">🔐 Comptes de test générés</h3>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white dark:bg-gray-800 rounded-lg">
              <span className="text-xl sm:text-2xl flex-shrink-0">👑</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">user1@jobbingtrack.test</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">SUPER_ADMIN - Accès complet</p>
              </div>
              <code className="px-2 sm:px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 flex-shrink-0">password123</code>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white dark:bg-gray-800 rounded-lg">
              <span className="text-xl sm:text-2xl flex-shrink-0">👨‍💼</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">user2@jobbingtrack.test</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">ADMIN - Gestion administrative</p>
              </div>
              <code className="px-2 sm:px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 flex-shrink-0">password123</code>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white dark:bg-gray-800 rounded-lg">
              <span className="text-xl sm:text-2xl flex-shrink-0">👤</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">user3@jobbingtrack.test</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">USER - Utilisateur standard</p>
              </div>
              <code className="px-2 sm:px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 flex-shrink-0">password123</code>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function ConfigSlider({ label, value, onChange, min, max, icon }: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  icon: string
}) {
  return (
    <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 sm:gap-2">
          <span className="text-sm sm:text-base">{icon}</span>
          <span>{label}</span>
        </label>
        <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs sm:text-sm font-bold flex-shrink-0">
          {value}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
      />

      <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

