'use client'

import { useEffect } from 'react'
import { Settings, User, X } from 'lucide-react'

interface QuickMenuPopupProps {
  isOpen: boolean
  onClose: () => void
  onSelectProfile: () => void
  onSelectSettings: () => void
}

export function QuickMenuPopup({ isOpen, onClose, onSelectProfile, onSelectSettings }: QuickMenuPopupProps) {
  // Récupérer le token depuis localStorage
  useEffect(() => {
    if (isOpen) {
      const storedToken = localStorage.getItem('token') || localStorage.getItem('authToken')
      setToken(storedToken)
    }
  }, [isOpen])

  // Copier le token dans le presse-papier
  const handleCopyToken = async () => {
    if (token) {
      try {
        await navigator.clipboard.writeText(token)
        setTokenCopied(true)
        setTimeout(() => setTokenCopied(false), 2000)
      } catch (err) {
        console.error('Erreur lors de la copie:', err)
        // Fallback pour les navigateurs qui ne supportent pas clipboard API
        const textArea = document.createElement('textarea')
        textArea.value = token
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setTokenCopied(true)
        setTimeout(() => setTokenCopied(false), 2000)
      }
    }
  }

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Menu rapide
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          {/* Option Profil */}
          <button
            onClick={() => {
              onSelectProfile()
              onClose()
            }}
            className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-105 transition-transform">
              👤
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                Mon Profil
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Gérer mes informations personnelles
              </div>
            </div>
          </button>

          {/* Option Paramètres */}
          <button
            onClick={() => {
              onSelectSettings()
              onClose()
            }}
            className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
              <Settings className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                Paramètres & Configuration
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Configuration système et préférences
              </div>
            </div>
          </button>

          {/* Option Token JWT */}
          {token && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Token JWT
                </span>
              </div>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="flex-1 text-left text-xs font-mono bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    {showToken ? token : '••••••••••••••••••••••••••••••••'}
                  </button>
                  <button
                    onClick={handleCopyToken}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
                    title="Copier le token"
                  >
                    {tokenCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span className="hidden sm:inline">Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="hidden sm:inline">Copier</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Cliquez pour {showToken ? 'masquer' : 'afficher'} le token
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
