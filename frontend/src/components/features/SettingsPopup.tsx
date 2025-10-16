import { useState } from 'react'
import { useTheme } from '@/lib/hooks/theme'
import { useAuth } from '@/lib/hooks/auth'

interface SettingsPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPopup({ isOpen, onClose }: SettingsPopupProps) {
  const { theme, actualTheme, toggleTheme, setThemeMode } = useTheme()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'appearance' | 'account' | 'notifications' | 'system'>('appearance')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Paramètres</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex h-[calc(100vh-200px)]">
          {/* Sidebar des onglets */}
          <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
            <nav className="space-y-2">
              {[
                { id: 'appearance', label: '🎨 Apparence', icon: '🎨' },
                { id: 'account', label: '👤 Compte', icon: '👤' },
                { id: 'notifications', label: '🔔 Notifications', icon: '🔔' },
                { id: 'system', label: '⚙️ Système', icon: '⚙️' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white dark:bg-blue-500'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Contenu principal */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'appearance' && (
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Apparence</h4>

                <div className="space-y-6">
                  {/* Thème */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Thème d'affichage
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'light', label: 'Clair', icon: '☀️' },
                        { value: 'dark', label: 'Sombre', icon: '🌙' },
                        { value: 'system', label: 'Système', icon: '🖥️' }
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => setThemeMode(option.value as any)}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            theme === option.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-2">{option.icon}</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{option.label}</div>
                            {theme === option.value && (
                              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Actif</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prévisualisation */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Prévisualisation
                    </label>
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Interface principale</span>
                          <div className={`w-4 h-4 rounded-full ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-300'}`}></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Cartes et sections</span>
                          <div className={`w-4 h-4 rounded ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Texte principal</span>
                          <div className={`w-4 h-4 rounded ${actualTheme === 'dark' ? 'bg-gray-100' : 'bg-gray-900'}`}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Compte</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Informations personnelles</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user?.firstName} {user?.lastName} • {user?.email}
                      </p>
                    </div>
                    <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Modifier
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Mot de passe</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Dernière modification récente
                      </p>
                    </div>
                    <button className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Changer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Notifications par email</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Recevoir les notifications importantes par email
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Notifications push</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Notifications push dans le navigateur
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Système</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Cache des données</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Vider le cache pour résoudre les problèmes d'affichage
                      </p>
                    </div>
                    <button className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                      Vider le cache
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Données hors ligne</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Synchroniser les données pour le mode hors ligne
                      </p>
                    </div>
                    <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Synchroniser
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
