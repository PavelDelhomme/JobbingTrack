'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { Eye, EyeOff, Save, X, LogOut, User, Shield, Bell, Palette, Clock, RefreshCw } from '@/lib/icons'
import preferencesService, { type UserPreferences } from '@/lib/services/preferencesService'

interface ProfilePopupProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfilePopup({ isOpen, onClose }: ProfilePopupProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Initialiser les données du formulaire avec les données utilisateur
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    }
  }, [user])

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

  // Fermer la popup avec la touche Échap
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Empêcher le scroll du body
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Sauvegarder les préférences si elles ont changé
      if (preferences) {
        await preferencesService.updateUserPreferences(preferences)
      }
      
      // Ici on pourrait faire un appel API pour sauvegarder les modifications du profil
      console.log('Sauvegarde des données:', formData)
      
      setMessage({ type: 'success', text: 'Paramètres sauvegardés avec succès' })
      setTimeout(() => setMessage(null), 3000)
      setIsEditing(false)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const updateRefreshInterval = (key: keyof UserPreferences['refreshInterval'], value: number) => {
    if (!preferences) return
    setPreferences({
      ...preferences,
      refreshInterval: {
        ...preferences.refreshInterval,
        [key]: value
      }
    })
  }

  const formatInterval = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    return `${ms / 1000}s`
  }

  const handleLogout = () => {
    logout()
    onClose()
  }

  const handleViewProfile = () => {
    router.push('/b4ck0ff1ce/profile')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message de notification */}
        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' 
              : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
          }`}>
            {message.type === 'success' ? '✓' : '✗'}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Informations utilisateur */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4" />
              Informations personnelles
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prénom
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
              />
            </div>
          </div>

          {/* Changement de mot de passe */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Sécurité
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mot de passe actuel
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirmer
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Paramètres de rafraîchissement */}
          {preferences && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Intervalles de Rafraîchissement
              </h3>
              
              <div className="space-y-3">
                {/* Logs */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Logs de Sécurité
                    </label>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                      {formatInterval(preferences.refreshInterval.logs)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="120000"
                    step="5000"
                    value={preferences.refreshInterval.logs}
                    onChange={(e) => updateRefreshInterval('logs', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                  />
                </div>

                {/* Analytics */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Analytics & Performance
                    </label>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                      {formatInterval(preferences.refreshInterval.analytics)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="120000"
                    step="5000"
                    value={preferences.refreshInterval.analytics}
                    onChange={(e) => updateRefreshInterval('analytics', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                  />
                </div>

                {/* Métriques */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Métriques Système
                    </label>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                      {formatInterval(preferences.refreshInterval.metrics)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="120000"
                    step="5000"
                    value={preferences.refreshInterval.metrics}
                    onChange={(e) => updateRefreshInterval('metrics', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                  />
                </div>

                {/* Dashboard */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Dashboard
                    </label>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                      {formatInterval(preferences.refreshInterval.dashboard)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="300000"
                    step="10000"
                    value={preferences.refreshInterval.dashboard}
                    onChange={(e) => updateRefreshInterval('dashboard', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                  />
                </div>

                {/* Services */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      État des Services
                    </label>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                      {formatInterval(preferences.refreshInterval.services)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="180000"
                    step="10000"
                    value={preferences.refreshInterval.services}
                    onChange={(e) => updateRefreshInterval('services', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                  />
                </div>
              </div>

              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>💡 Conseil:</strong> Des intervalles plus courts offrent des données plus fraîches mais augmentent la charge réseau.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={handleViewProfile}
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Voir le profil complet
            </button>
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Sauvegarder
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Modifier
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
