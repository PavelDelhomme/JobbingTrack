'use client'

import { useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { adminService } from '@/lib/api'

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

  const [generating, setGenerating] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [output, setOutput] = useState<string>('')
  const [showOutput, setShowOutput] = useState(false)

  const handleGenerate = async () => {
    if (!confirm(
      `⚠️ ATTENTION ⚠️\n\nVoulez-vous générer des données de test avec cette configuration ?\n\nCela va créer:\n` +
      `- ${config.users} utilisateurs\n` +
      `- ${config.companies} entreprises\n` +
      `- ${config.applications} candidatures\n` +
      `- ${config.contacts} contacts\n` +
      `- ${config.interviews} entretiens\n` +
      `- ${config.followups} relances\n` +
      `- ${config.calls} appels\n` +
      `- ${config.deletedItems} éléments en corbeille\n` +
      `- ${config.archivedItems} éléments archivés`
    )) return

    setGenerating(true)
    setOutput('')
    setShowOutput(true)

    try {
      const response = await adminService.generateTestData(config)
      
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
      name: 'Minimal',
      description: 'Configuration minimale pour tests rapides',
      icon: '⚡',
      config: {
        users: 2,
        companies: 5,
        applications: 5,
        contacts: 5,
        interviews: 2,
        followups: 3,
        calls: 2,
        events: 5,
        deletedItems: 1,
        archivedItems: 1
      }
    },
    {
      name: 'Standard',
      description: 'Configuration équilibrée pour développement',
      icon: '📊',
      config: {
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
      }
    },
    {
      name: 'Complet',
      description: 'Beaucoup de données pour tests de performance',
      icon: '🚀',
      config: {
        users: 5,
        companies: 20,
        applications: 50,
        contacts: 40,
        interviews: 20,
        followups: 30,
        calls: 25,
        events: 50,
        deletedItems: 10,
        archivedItems: 8
      }
    },
    {
      name: 'Démo',
      description: 'Configuration pour démonstration client',
      icon: '🎬',
      config: {
        users: 1,
        companies: 8,
        applications: 15,
        contacts: 12,
        interviews: 6,
        followups: 8,
        calls: 5,
        events: 15,
        deletedItems: 2,
        archivedItems: 2
      }
    }
  ]

  const totalItems = Object.values(config).reduce((sum, val) => sum + val, 0)

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">🎲 Générateur de Données de Test</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Générez des données réalistes et cohérentes pour tester l'application
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 mb-8">
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

        {/* Presets */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">📋 Configurations prédéfinies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {presets.map(preset => (
              <button
                key={preset.name}
                onClick={() => setConfig(preset.config)}
                className="text-left p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all"
              >
                <div className="text-4xl mb-3">{preset.icon}</div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{preset.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{preset.description}</p>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {Object.values(preset.config).reduce((sum, val) => sum + val, 0)} éléments au total
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration personnalisée */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">⚙️ Configuration personnalisée</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ConfigSlider
              label="👥 Utilisateurs"
              value={config.users}
              onChange={(val) => setConfig({ ...config, users: val })}
              min={1}
              max={10}
              icon="👥"
            />
            
            <ConfigSlider
              label="🏢 Entreprises"
              value={config.companies}
              onChange={(val) => setConfig({ ...config, companies: val })}
              min={5}
              max={30}
              icon="🏢"
            />
            
            <ConfigSlider
              label="📋 Candidatures"
              value={config.applications}
              onChange={(val) => setConfig({ ...config, applications: val })}
              min={5}
              max={100}
              icon="📋"
            />
            
            <ConfigSlider
              label="👤 Contacts"
              value={config.contacts}
              onChange={(val) => setConfig({ ...config, contacts: val })}
              min={5}
              max={50}
              icon="👤"
            />
            
            <ConfigSlider
              label="🎤 Entretiens"
              value={config.interviews}
              onChange={(val) => setConfig({ ...config, interviews: val })}
              min={0}
              max={50}
              icon="🎤"
            />
            
            <ConfigSlider
              label="📧 Relances"
              value={config.followups}
              onChange={(val) => setConfig({ ...config, followups: val })}
              min={0}
              max={50}
              icon="📧"
            />
            
            <ConfigSlider
              label="📞 Appels"
              value={config.calls}
              onChange={(val) => setConfig({ ...config, calls: val })}
              min={0}
              max={50}
              icon="📞"
            />
            
            <ConfigSlider
              label="📅 Événements"
              value={config.events}
              onChange={(val) => setConfig({ ...config, events: val })}
              min={0}
              max={100}
              icon="📅"
            />
            
            <ConfigSlider
              label="🗑️ Éléments supprimés"
              value={config.deletedItems}
              onChange={(val) => setConfig({ ...config, deletedItems: val })}
              min={0}
              max={20}
              icon="🗑️"
            />
            
            <ConfigSlider
              label="📦 Éléments archivés"
              value={config.archivedItems}
              onChange={(val) => setConfig({ ...config, archivedItems: val })}
              min={0}
              max={20}
              icon="📦"
            />
          </div>

          {/* Résumé */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total d'éléments à générer</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{totalItems}</p>
              </div>
              <div className="text-gray-400 dark:text-gray-500 text-6xl">🎲</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 px-8 py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Génération en cours...</span>
              </>
            ) : (
              <>
                <span className="text-2xl">🎲</span>
                <span className="font-semibold">Générer les données de test</span>
              </>
            )}
          </button>

          <button
            onClick={handleClear}
            disabled={clearing || generating}
            className="px-8 py-4 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
          >
            {clearing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Nettoyage...</span>
              </>
            ) : (
              <>
                <span className="text-xl">🗑️</span>
                <span>Tout supprimer</span>
              </>
            )}
          </button>
        </div>

        {/* Output */}
        {showOutput && (
          <div className="bg-gray-900 dark:bg-gray-800 text-green-400 dark:text-green-300 rounded-lg p-6 font-mono text-sm overflow-auto max-h-96">
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

        {/* Info */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 dark:text-blue-400 text-2xl">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Comment utiliser le générateur</h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
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

              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🎯 Données générées</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-300">
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

        {/* Exemples de comptes */}
        <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">🔐 Comptes de test générés</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <span className="text-2xl">👑</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">user1@jobbingtrack.test</p>
                <p className="text-gray-600 dark:text-gray-400">SUPER_ADMIN - Accès complet</p>
              </div>
              <code className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">password123</code>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <span className="text-2xl">👨‍💼</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">user2@jobbingtrack.test</p>
                <p className="text-gray-600 dark:text-gray-400">ADMIN - Gestion administrative</p>
              </div>
              <code className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">password123</code>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <span className="text-2xl">👤</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">user3@jobbingtrack.test</p>
                <p className="text-gray-600 dark:text-gray-400">USER - Utilisateur standard</p>
              </div>
              <code className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">password123</code>
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
    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <span>{icon}</span>
          <span>{label}</span>
        </label>
        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-bold">
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

      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

