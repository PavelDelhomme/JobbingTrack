import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from '@/lib/hooks/theme'
import { useAuth } from '@/lib/hooks/auth'
import preferencesService, { type UserPreferences } from '@/lib/services/preferencesService'
import { RefreshCw, Save, Check, Clock, Loader2 } from 'lucide-react'

interface SettingsPopupProps {
  isOpen: boolean
  onClose: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function SettingsPopup({ isOpen, onClose }: SettingsPopupProps) {
  const { theme, actualTheme, toggleTheme, setThemeMode } = useTheme()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'appearance' | 'account' | 'notifications' | 'system' | 'refresh'>('appearance')
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Refs pour debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Charger les préférences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await preferencesService.getUserPreferences()
        setPreferences(prefs)
      } catch (error) {
        console.error('Erreur chargement préférences:', error)
      }
    }
    if (isOpen) {
      loadPreferences()
    }
  }, [isOpen])

  // Fonction d'enregistrement automatique avec debounce
  const autoSave = useCallback((newPreferences: UserPreferences) => {
    // Annuler l'enregistrement précédent s'il existe
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Annuler le timeout de statut s'il existe
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current)
    }

    // Indiquer que la sauvegarde est en attente
    setSaveStatus('saving')
    
    // Programmer l'enregistrement avec un délai de 800ms
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await preferencesService.updateUserPreferences(newPreferences)
        setSaveStatus('saved')
        
        // Réinitialiser le statut après 2 secondes
        statusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle')
        }, 2000)
      } catch (error) {
        console.error('Erreur sauvegarde automatique:', error)
        setSaveStatus('error')
        
        // Réinitialiser le statut d'erreur après 3 secondes
        statusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle')
        }, 3000)
      }
    }, 800) // Debounce de 800ms
  }, [])

  // Nettoyer les timeouts au démontage
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
      }
    }
  }, [])

  // Mise à jour avec auto-save
  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    if (!preferences) return
    
    const newPreferences = { ...preferences, ...updates }
    setPreferences(newPreferences)
    autoSave(newPreferences)
  }, [preferences, autoSave])

  const updateRefreshInterval = useCallback((key: keyof UserPreferences['refreshInterval'], value: number) => {
    if (!preferences) return
    
    const newPreferences = {
      ...preferences,
      refreshInterval: {
        ...preferences.refreshInterval,
        [key]: value
      }
    }
    setPreferences(newPreferences)
    autoSave(newPreferences)
  }, [preferences, autoSave])

  const updateDisplay = useCallback((key: keyof UserPreferences['display'], value: any) => {
    if (!preferences) return
    
    const newPreferences = {
      ...preferences,
      display: {
        ...preferences.display,
        [key]: value
      }
    }
    setPreferences(newPreferences)
    autoSave(newPreferences)
  }, [preferences, autoSave])

  const updateNotifications = useCallback((key: keyof UserPreferences['notifications'], value: boolean) => {
    if (!preferences) return
    
    const newPreferences = {
      ...preferences,
      notifications: {
        ...preferences.notifications,
        [key]: value
      }
    }
    setPreferences(newPreferences)
    autoSave(newPreferences)
  }, [preferences, autoSave])

  const formatInterval = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    return `${ms / 1000}s`
  }

  if (!isOpen) return null

  // Indicateur de statut de sauvegarde
  const SaveStatusIndicator = () => {
    if (saveStatus === 'idle') return null
    
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all">
        {saveStatus === 'saving' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-blue-600">Enregistrement...</span>
          </>
        )}
        {saveStatus === 'saved' && (
          <>
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-green-600">Enregistré !</span>
          </>
        )}
        {saveStatus === 'error' && (
          <>
            <Clock className="h-4 w-4 text-red-600" />
            <span className="text-red-600">Erreur</span>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Paramètres</h3>
              <SaveStatusIndicator />
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            💡 Les modifications sont enregistrées automatiquement
          </p>
        </div>

        <div className="flex h-[calc(100vh-200px)]">
          {/* Sidebar des onglets */}
          <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
            <nav className="space-y-2">
              {[
                { id: 'appearance', label: '🎨 Apparence', icon: '🎨' },
                { id: 'refresh', label: '🔄 Rafraîchissement', icon: '🔄' },
                { id: 'notifications', label: '🔔 Notifications', icon: '🔔' },
                { id: 'display', label: '📱 Affichage', icon: '📱' },
                { id: 'system', label: '⚙️ Système', icon: '⚙️' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Contenu des onglets */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Onglet Apparence */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Apparence</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Thème
                    </label>
                    <div className="flex gap-2">
                      {['light', 'dark', 'system'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            setThemeMode(mode as any)
                            updatePreferences({ theme: mode })
                          }}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            theme === mode
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {mode === 'light' && '☀️ Clair'}
                          {mode === 'dark' && '🌙 Sombre'}
                          {mode === 'system' && '💻 Système'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Langue
                    </label>
                    <select
                      value={preferences?.language || 'fr'}
                      onChange={(e) => updatePreferences({ language: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="fr">🇫🇷 Français</option>
                      <option value="en">🇬🇧 English</option>
                      <option value="es">🇪🇸 Español</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fuseau horaire
                    </label>
                    <select
                      value={preferences?.timezone || 'Europe/Paris'}
                      onChange={(e) => updatePreferences({ timezone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="Europe/Paris">🇫🇷 Europe/Paris (CET)</option>
                      <option value="Europe/London">🇬🇧 Europe/London (GMT)</option>
                      <option value="America/New_York">🇺🇸 America/New_York (EST)</option>
                      <option value="America/Los_Angeles">🇺🇸 America/Los_Angeles (PST)</option>
                      <option value="Asia/Tokyo">🇯🇵 Asia/Tokyo (JST)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Onglet Rafraîchissement */}
            {activeTab === 'refresh' && preferences && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Intervalles de Rafraîchissement</h4>
                
                <div className="space-y-6">
                  {[
                    { key: 'logs' as const, label: 'Logs de Sécurité', min: 5, max: 120, step: 5 },
                    { key: 'analytics' as const, label: 'Analytics', min: 5, max: 60, step: 5 },
                    { key: 'metrics' as const, label: 'Métriques', min: 5, max: 60, step: 5 },
                    { key: 'dashboard' as const, label: 'Dashboard', min: 10, max: 120, step: 10 },
                    { key: 'services' as const, label: 'Services', min: 10, max: 120, step: 10 }
                  ].map(({ key, label, min, max, step }) => {
                    const value = (preferences.refreshInterval?.[key] || 30000) / 1000
                    return (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {label}
                          </label>
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {formatInterval(value * 1000)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={step}
                          value={value}
                          onChange={(e) => updateRefreshInterval(key, parseInt(e.target.value) * 1000)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>{min}s</span>
                          <span>{max}s</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    💡 <strong>Conseil :</strong> Des intervalles plus courts (5-15s) offrent une meilleure réactivité mais consomment plus de ressources. Pour un usage optimal, utilisez 20-30s.
                  </p>
                </div>
              </div>
            )}

            {/* Onglet Notifications */}
            {activeTab === 'notifications' && preferences && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h4>
                
                <div className="space-y-4">
                  {[
                    { key: 'desktop' as const, label: 'Notifications Bureau', desc: 'Recevoir des notifications de bureau' },
                    { key: 'sound' as const, label: 'Son', desc: 'Jouer un son pour les notifications' },
                    { key: 'highPriorityOnly' as const, label: 'Priorité Élevée Uniquement', desc: 'Ne montrer que les notifications importantes' }
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{label}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{desc}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.notifications?.[key] || false}
                          onChange={(e) => updateNotifications(key, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Onglet Affichage */}
            {activeTab === 'display' && preferences && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Affichage</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Éléments par page
                    </label>
                    <select
                      value={preferences.display?.itemsPerPage || 20}
                      onChange={(e) => updateDisplay('itemsPerPage', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>

                  {[
                    { key: 'compactMode' as const, label: 'Mode Compact', desc: 'Interface plus dense' },
                    { key: 'showCharts' as const, label: 'Afficher les Graphiques', desc: 'Afficher les graphiques sur le dashboard' },
                    { key: 'showMetrics' as const, label: 'Afficher les Métriques', desc: 'Afficher les métriques détaillées' }
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{label}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{desc}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.display?.[key] !== false}
                          onChange={(e) => updateDisplay(key, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Onglet Système */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Informations Système</h4>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Utilisateur</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{user?.email}</div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Rôle</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? '👑 Administrateur' : '👤 Utilisateur'}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Version</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">JobbingTrack v1.0.0</div>
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        await preferencesService.resetUserPreferences()
                        const prefs = await preferencesService.getUserPreferences()
                        setPreferences(prefs)
                        alert('Préférences réinitialisées avec succès !')
                      } catch (error) {
                        console.error('Erreur:', error)
                        alert('Erreur lors de la réinitialisation')
                      }
                    }}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    🔄 Réinitialiser tous les paramètres
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
