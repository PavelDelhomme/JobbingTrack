'use client'

import { useState, useEffect } from 'react'
import { useCustomization } from '@/hooks/useCustomization'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import { Save, RotateCcw, LogOut, User, Palette, Layout, Bell, Eye, Globe, Database, X, ChevronDown, Check } from 'lucide-react'

interface SettingsPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPopup({ isOpen, onClose }: SettingsPopupProps) {
  const { settings, saveSettings, resetSettings, isLoading } = useCustomization()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [localSettings, setLocalSettings] = useState(settings)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  // Mettre à jour les paramètres locaux
  const updateLocalSettings = (updates: Partial<typeof localSettings>) => {
    const newSettings = { ...localSettings, ...updates }
    setLocalSettings(newSettings)
    setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(settings))
  }

  // Sauvegarder les paramètres
  const handleSave = async () => {
    await saveSettings(localSettings)
    setHasChanges(false)
    onClose()
  }

  // Réinitialiser aux paramètres par défaut
  const handleReset = async () => {
    await resetSettings()
    setLocalSettings(settings)
    setHasChanges(false)
  }

  // Fermer le popup avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <span className="text-3xl">⚙️</span>
              Paramètres & Configuration
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gérez vos préférences et paramètres utilisateur
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* Sidebar des onglets */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
            <nav className="space-y-2">
              {[
                { id: 'profile', label: '👤 Profil & Compte', icon: User },
                { id: 'appearance', label: '🎨 Apparence', icon: Palette },
                { id: 'layout', label: '📐 Disposition', icon: Layout },
                { id: 'notifications', label: '🔔 Notifications', icon: Bell },
                { id: 'accessibility', label: '♿ Accessibilité', icon: Eye },
                { id: 'data', label: '💾 Données & Confidentialité', icon: Database },
                { id: 'integrations', label: '🌐 Intégrations', icon: Globe },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-l-4 border-blue-500'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </nav>

            {/* Actions utilisateur */}
            <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-2">
                <button
                  onClick={() => {
                    router.push('/backoffice/profile')
                    onClose()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <User className="h-5 w-5" />
                  <span className="font-medium">Mon Profil</span>
                </button>

                <button
                  onClick={() => {
                    logout()
                    onClose()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Se Déconnecter</span>
                </button>
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="flex-1 p-6 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Chargement...</span>
              </div>
            ) : (
              <>
                {/* Onglet Profil & Compte */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Informations du Compte
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nom d'utilisateur
                          </label>
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {user?.firstName} {user?.lastName}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email
                          </label>
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {user?.email}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Rôle
                          </label>
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                            <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                              {user?.role?.toLowerCase().replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Dernière connexion
                          </label>
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {new Date().toLocaleString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Onglet Apparence - Version simplifiée */}
                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Thème et couleurs
                    </h3>

                    {/* Sélecteur de thème simplifié */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Thème
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'light', label: 'Clair', icon: '☀️' },
                          { value: 'dark', label: 'Sombre', icon: '🌙' },
                          { value: 'auto', label: 'Auto', icon: '⚡' }
                        ].map((theme) => (
                          <button
                            key={theme.value}
                            onClick={() => updateLocalSettings({ theme: theme.value as any })}
                            className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                              localSettings.theme === theme.value
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <span className="text-2xl">{theme.icon}</span>
                            <span className="font-medium">{theme.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sélecteur de couleur principale simplifié */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Couleur principale
                      </label>
                      <div className="flex gap-3 flex-wrap">
                        {[
                          '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
                          '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
                        ].map((color) => (
                          <button
                            key={color}
                            onClick={() => updateLocalSettings({ primaryColor: color })}
                            className={`w-12 h-12 rounded-full border-4 transition-all ${
                              localSettings.primaryColor === color
                                ? 'border-gray-900 dark:border-gray-100 scale-110 shadow-lg'
                                : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Onglets Layout, Notifications, Accessibilité, Data - Version simplifiée */}
                {['layout', 'notifications', 'accessibility', 'data', 'integrations'].map((tabId) => (
                  <div key={tabId} className={`space-y-6 ${activeTab === tabId ? '' : 'hidden'}`}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      {tabId === 'layout' && '📐 Disposition et affichage'}
                      {tabId === 'notifications' && '🔔 Préférences de notifications'}
                      {tabId === 'accessibility' && '♿ Options d\'accessibilité'}
                      {tabId === 'data' && '💾 Données et confidentialité'}
                      {tabId === 'integrations' && '🌐 Intégrations externes'}
                    </h3>

                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <div className="text-6xl mb-4">
                        {tabId === 'layout' && '📐'}
                        {tabId === 'notifications' && '🔔'}
                        {tabId === 'accessibility' && '♿'}
                        {tabId === 'data' && '💾'}
                        {tabId === 'integrations' && '🌐'}
                      </div>
                      <p className="text-lg font-medium mb-2">
                        {tabId === 'layout' && 'Disposition et affichage'}
                        {tabId === 'notifications' && 'Préférences de notifications'}
                        {tabId === 'accessibility' && 'Options d\'accessibilité'}
                        {tabId === 'data' && 'Données et confidentialité'}
                        {tabId === 'integrations' && 'Intégrations externes'}
                      </p>
                      <p className="text-sm">
                        Cette section sera développée dans une prochaine mise à jour avec des options avancées.
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Footer avec boutons d'action */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </button>

            {hasChanges && (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Modifications non sauvegardées</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Save className="h-4 w-4" />
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
