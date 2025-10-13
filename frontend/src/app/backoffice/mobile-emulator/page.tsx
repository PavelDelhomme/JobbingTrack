'use client'

import { useState, useEffect } from 'react'

// Styles CSS personnalisés pour l'émulateur mobile
const mobileEmulatorStyles = `
  /* Masquer les barres de défilement sur tous les navigateurs */
  .mobile-scroll::-webkit-scrollbar {
    display: none;
  }
  .mobile-scroll {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* Masquer les barres de défilement pour la navigation */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Indicateur de scroll subtil pour le contenu qui dépasse */
  .scroll-indicator {
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 60%;
    background: linear-gradient(to bottom,
      transparent 0%,
      rgba(59, 130, 246, 0.3) 20%,
      rgba(59, 130, 246, 0.6) 50%,
      rgba(59, 130, 246, 0.3) 80%,
      transparent 100%);
    border-radius: 1px;
    opacity: var(--scroll-indicator-opacity, 0);
    transition: opacity 0.2s ease;
    pointer-events: none;
  }

  /* Animation de rebond pour les éléments interactifs */
  @keyframes mobileBounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-3px);
    }
    60% {
      transform: translateY(-2px);
    }
  }

  .mobile-bounce {
    animation: mobileBounce 1s infinite;
  }

  /* Effet de vibration pour les interactions */
  @keyframes mobileVibrate {
    0% { transform: translateX(0); }
    25% { transform: translateX(-1px); }
    50% { transform: translateX(1px); }
    75% { transform: translateX(-1px); }
    100% { transform: translateX(0); }
  }

  .mobile-vibrate {
    animation: mobileVibrate 0.1s ease-in-out;
  }
`
import AdminLayout from '@/components/AdminLayout'
import MobileNotificationCenter from '@/app/backoffice/components/MobileNotificationCenter'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import axios from 'axios'

type DeviceType = 'iphone-14' | 'iphone-14-pro-max' | 'pixel-7' | 'samsung-s23' | 'ipad'
type OrientationType = 'portrait' | 'landscape'
type MobileScreen = 'login' | 'home' | 'applications' | 'companies' | 'contacts' | 'interviews' | 'profile' | 'settings' | 'admin-backoffice'
type EmulatorType = 'web' | 'flutter'

interface Device {
  id: DeviceType
  name: string
  width: number
  height: number
  icon: string
  os: 'iOS' | 'Android' | 'Tablet'
}

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

interface Application {
  id: string
  position: string
  company: { name: string }
  status: string
}

const DEVICES: Device[] = [
  { id: 'iphone-14', name: 'iPhone 14', width: 390, height: 844, icon: '📱', os: 'iOS' },
  { id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', width: 430, height: 932, icon: '📱', os: 'iOS' },
  { id: 'pixel-7', name: 'Google Pixel 7', width: 412, height: 915, icon: '📱', os: 'Android' },
  { id: 'samsung-s23', name: 'Samsung Galaxy S23', width: 360, height: 780, icon: '📱', os: 'Android' },
  { id: 'ipad', name: 'iPad Pro 11"', width: 834, height: 1194, icon: '📱', os: 'Tablet' }
]

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function MobileEmulatorPage() {
  // ✅ HOOKS - Tous les hooks doivent être déclarés en premier
  const { user: adminUser, loading: authLoading, isAuthenticated } = useAuth()
  const [selectedDevice, setSelectedDevice] = useState<Device>(DEVICES[0])
  const [orientation, setOrientation] = useState<OrientationType>('portrait')
  const [scale, setScale] = useState(0.8)
  const [showDeviceFrame, setShowDeviceFrame] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [networkSpeed, setNetworkSpeed] = useState<'fast' | 'slow' | 'offline'>('fast')

  // Mobile app state
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>('login')
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [mobileToken, setMobileToken] = useState<string | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [touchEffect, setTouchEffect] = useState<{ x: number; y: number } | null>(null)
  const [showUserSwitcher, setShowUserSwitcher] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<Array<{ time: string; type: 'info' | 'error' | 'success'; message: string }>>([])
  const [appRunning, setAppRunning] = useState(true)
  const [hasAutoLoggedIn, setHasAutoLoggedIn] = useState(false)
  const [emulatorType, setEmulatorType] = useState<EmulatorType>('web')
  const [showMonitoring, setShowMonitoring] = useState(true)

  // ✅ Calculs après les hooks
  const width = orientation === 'portrait' ? selectedDevice.width : selectedDevice.height
  const height = orientation === 'portrait' ? selectedDevice.height : selectedDevice.width

  // ✅ FONCTIONS UTILES
  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const time = new Date().toLocaleTimeString('fr-FR')
    setLogs(prevLogs => [{ time, type, message }, ...prevLogs.slice(0, 49)])
  }

  // ✅ HOOKS - Tous les hooks doivent être déclarés ici
  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      if (isMounted) {
        await loadUsers()
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (selectedUser && !mobileToken && !hasAutoLoggedIn) {
      setHasAutoLoggedIn(true)
      loginAsUser(selectedUser.email)
    }
  }, [selectedUser, mobileToken, hasAutoLoggedIn])

  useEffect(() => {
    let isMounted = true
    if (mobileToken && currentScreen !== 'login' && isMounted) {
      loadApplications()
    }
    return () => { isMounted = false }
  }, [mobileToken, currentScreen])

  // ✅ Vérification d'authentification (après tous les hooks)
  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Vérification de l'authentification...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!isAuthenticated) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg mb-4">Accès refusé</p>
            <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const loadUsers = async () => {
    try {
      addLog('Chargement des utilisateurs...', 'info')
      // Récupérer les vrais utilisateurs de la base de données
      const response = await axios.get(`${API_URL}/api/v1/auth/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })

      if (response.data.success && response.data.users) {
        // Filtrer les utilisateurs actifs et non supprimés
        const activeUsers = response.data.users.filter((user: any) =>
          user.isActive && !user.isDeleted && !user.isArchived
        )
        setUsers(activeUsers)
        addLog(`${activeUsers.length} utilisateurs chargés depuis la base de données`, 'success')
      } else {
        throw new Error('Aucun utilisateur trouvé')
      }
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error)
      addLog('Erreur chargement utilisateurs, utilisation de données de test', 'error')
      // Fallback sur les utilisateurs de test si l'API ne fonctionne pas
      setUsers([
        { id: '1', email: 'admin@jobbingtrack.test', firstName: 'Admin', lastName: 'JobbingTrack', role: 'SUPER_ADMIN' },
        { id: '2', email: 'admin@jobbingtrack.test', firstName: 'Admin', lastName: 'JobbingTrack', role: 'SUPER_ADMIN' },
        { id: '3', email: 'redacted@example.invalid', firstName: 'Test', lastName: 'User', role: 'USER' },
      ])
    }
  }

  const loginAsUser = async (email: string, password: string = 'password123') => {
    setLoadingData(true)
    addLog(`Tentative de connexion pour ${email}`, 'info')
    try {
      const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
        email,
        password
      })
      if (response.data.success && response.data.token) {
        setMobileToken(response.data.token)
        const user = users.find(u => u.email === email)
        if (user) setSelectedUser(user)
        setCurrentScreen('home')
        addLog(`Connexion réussie pour ${email}`, 'success')
      }
    } catch (error: any) {
      console.error('Erreur login:', error)
      addLog(`Erreur de connexion: ${error.message}`, 'error')
      alert(`Erreur de connexion: ${error.message}`)
    } finally {
      setLoadingData(false)
    }
  }

  const loadApplications = async () => {
    if (!mobileToken) return
    setLoadingData(true)
    addLog('Chargement des candidatures...', 'info')
    try {
      const response = await axios.get(`${API_URL}/api/v1/applications`, {
        headers: { Authorization: `Bearer ${mobileToken}` }
      })
      if (response.data.success) {
        setApplications(response.data.applications || [])
        addLog(`${response.data.applications?.length || 0} candidatures chargées`, 'success')
      }
    } catch (error: any) {
      console.error('Erreur chargement candidatures:', error)
      addLog(`Erreur chargement candidatures: ${error.message}`, 'error')
    } finally {
      setLoadingData(false)
    }
  }

  const handleScreenTouch = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Effet tactile amélioré
    setTouchEffect({ x, y })
    setTimeout(() => setTouchEffect(null), 200)

    // Vibration simulée plus réaliste
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  const logout = () => {
    addLog('Déconnexion de l\'utilisateur', 'info')
    setMobileToken(null)
    setSelectedUser(null)
    setHasAutoLoggedIn(false) // ✅ Réinitialiser le flag pour permettre un nouveau login
    setCurrentScreen('login')
    setApplications([])
  }

  const switchUser = (user: User) => {
    addLog(`Changement d'utilisateur vers ${user.email}`, 'info')
    logout()
    setHasAutoLoggedIn(false) // ✅ Réinitialiser le flag pour permettre un nouveau login
    setSelectedUser(user)
    setShowUserSwitcher(false)
    setTimeout(() => loginAsUser(user.email, 'password123'), 100)
  }

  const toggleOrientation = () => {
    setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')
    addLog(`Orientation changée: ${orientation === 'portrait' ? 'paysage' : 'portrait'}`, 'info')
  }

  const restartApp = () => {
    addLog('Redémarrage de l\'application...', 'info')
    setAppRunning(false)
    logout()
    setTimeout(() => {
      setAppRunning(true)
      addLog('Application redémarrée', 'success')
    }, 1000)
  }

  const stopApp = () => {
    addLog('Arrêt de l\'application', 'info')
    setAppRunning(false)
    logout()
  }

  const startApp = () => {
    addLog('Démarrage de l\'application', 'success')
    setAppRunning(true)
  }

  const clearLogs = () => {
    setLogs([])
    addLog('Logs effacés', 'info')
  }

  return (
    <AdminLayout>
      <style jsx>{mobileEmulatorStyles}</style>
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
        {/* Toolbar - Responsive et Mobile-First */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-2 sm:p-4">
          {/* Version Mobile - Contrôles essentiels en colonnes */}
          <div className="block lg:hidden space-y-3">
            {/* Première rangée - Sélection appareil et utilisateur */}
            <div className="flex items-center gap-2">
              {/* Emulator Type Selector - Mobile */}
              <div className="flex-shrink-0">
                <select
                  value={emulatorType}
                  onChange={(e) => {
                    const newType = e.target.value as EmulatorType
                    setEmulatorType(newType)
                    addLog(`Émulateur basculé vers: ${newType === 'flutter' ? 'Flutter' : 'Web'}`, 'info')
                  }}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
                >
                  <option value="web">🌐 Web</option>
                  <option value="flutter">🚀 Flutter</option>
                </select>
              </div>

              {/* Device Selector - Mobile */}
              <div className="flex-shrink-0">
                <select
                  value={selectedDevice.id}
                  onChange={(e) => {
                    const device = DEVICES.find(d => d.id === e.target.value)
                    if (device) setSelectedDevice(device)
                  }}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {DEVICES.map(device => (
                    <option key={device.id} value={device.id}>
                      {device.icon} {device.name.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Switcher - Mobile compact */}
              <div className="relative flex-1 min-w-0">
                <button
                  onClick={() => setShowUserSwitcher(!showUserSwitcher)}
                  className="w-full px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center justify-between gap-1"
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-sm">👤</span>
                    <span className="text-xs font-medium truncate">
                      {selectedUser ? `${selectedUser.firstName[0]}${selectedUser.lastName[0]}` : '👤'}
                    </span>
                  </div>
                  <span className="text-xs">▼</span>
                </button>

                {showUserSwitcher && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 w-full max-w-xs">
                    <div className="p-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                        Basculer vers un utilisateur :
                      </p>
                      {users.map(user => (
                        <button
                          key={user.id}
                          onClick={() => switchUser(user)}
                          className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm ${
                            selectedUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                              {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Deuxième rangée - Contrôles de visualisation */}
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleOrientation}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title={orientation === 'portrait' ? 'Passer en paysage' : 'Passer en portrait'}
                >
                  <span className="text-sm">{orientation === 'portrait' ? '📱' : '🔄'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Z:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-12"
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-6 text-center">
                    {Math.round(scale * 100)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowDeviceFrame(!showDeviceFrame)}
                  className={`px-2 py-1 rounded transition-colors ${
                    showDeviceFrame
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                  title={showDeviceFrame ? 'Masquer le cadre' : 'Afficher le cadre'}
                >
                  <span className="text-sm">📱</span>
                </button>

                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`px-2 py-1 rounded transition-colors ${
                    isDarkMode
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                  title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
                >
                  <span className="text-sm">{isDarkMode ? '🌙' : '☀️'}</span>
                </button>

                <select
                  value={networkSpeed}
                  onChange={(e) => setNetworkSpeed(e.target.value as any)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  title="Vitesse réseau"
                >
                  <option value="fast">📶</option>
                  <option value="slow">📶</option>
                  <option value="offline">📵</option>
                </select>
              </div>
            </div>

            {/* Troisième rangée - Contrôles d'application et monitoring */}
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-1">
                {emulatorType === 'flutter' ? (
                  <>
                    <button
                      onClick={() => {
                        fetch('http://localhost:8090/api/reload', { method: 'POST' })
                          .then(() => addLog('Rechargement Flutter demandé', 'info'))
                          .catch(err => addLog(`Erreur rechargement: ${err.message}`, 'error'));
                      }}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      title="Recharger Flutter"
                    >
                      <span className="text-xs">🔄</span>
                    </button>
                    <button
                      onClick={() => {
                        fetch('http://localhost:8090/api/hot-restart', { method: 'POST' })
                          .then(() => addLog('Hot restart Flutter demandé', 'info'))
                          .catch(err => addLog(`Erreur hot restart: ${err.message}`, 'error'));
                      }}
                      className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
                      title="Hot Restart Flutter"
                    >
                      <span className="text-xs">⚡</span>
                    </button>
                    <button
                      onClick={() => {
                        addLog('Ouverture Dev Menu Flutter', 'info');
                      }}
                      className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                      title="Menu développeur Flutter"
                    >
                      <span className="text-xs">⚙️</span>
                    </button>
                  </>
                ) : (
                  <>
                    {appRunning ? (
                      <>
                        <button
                          onClick={restartApp}
                          className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
                          title="Redémarrer l'application"
                        >
                          <span className="text-xs">🔄</span>
                        </button>
                        <button
                          onClick={stopApp}
                          className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                          title="Arrêter l'application"
                        >
                          <span className="text-xs">⏹️</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={startApp}
                        className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                        title="Démarrer l'application"
                      >
                        <span className="text-xs">▶️</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowMonitoring(!showMonitoring)}
                  className={`px-2 py-1 rounded transition-colors ${
                    showMonitoring
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                  title={showMonitoring ? 'Masquer le monitoring' : 'Afficher le monitoring'}
                >
                  <span className="text-xs">📊</span>
                </button>

                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                    showLogs
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                  title="Afficher/masquer les logs"
                >
                  <span className="text-xs">📋</span>
                  {logs.length > 0 && <span className="text-xs">({logs.length})</span>}
                </button>
              </div>
            </div>
          </div>

          {/* Version Desktop - Contrôles organisés en lignes */}
          <div className="hidden lg:block">
            {/* Première ligne - Contrôles principaux */}
            <div className="flex items-center gap-3 mb-3">
              {/* Emulator Type Selector */}
              <div className="flex-shrink-0">
                <select
                  value={emulatorType}
                  onChange={(e) => {
                    const newType = e.target.value as EmulatorType
                    setEmulatorType(newType)
                    addLog(`Émulateur basculé vers: ${newType === 'flutter' ? 'Flutter' : 'Web'}`, 'info')
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
                >
                  <option value="web">🌐 Web</option>
                  <option value="flutter">🚀 Flutter</option>
                </select>
              </div>

              {/* Device Selector */}
              <div className="flex-shrink-0">
                <select
                  value={selectedDevice.id}
                  onChange={(e) => {
                    const device = DEVICES.find(d => d.id === e.target.value)
                    if (device) setSelectedDevice(device)
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {DEVICES.map(device => (
                    <option key={device.id} value={device.id}>
                      {device.icon} {device.name.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Switcher */}
              <div className="relative flex-1 min-w-0 max-w-md">
                <button
                  onClick={() => setShowUserSwitcher(!showUserSwitcher)}
                  className="w-full px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">👤</span>
                    <span className="text-sm font-medium truncate">
                      {selectedUser ? `${selectedUser.firstName[0]}${selectedUser.lastName[0]}` : '👤'}
                    </span>
                  </div>
                  <span className="text-sm">▼</span>
                </button>

                {showUserSwitcher && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 w-full max-w-sm">
                    <div className="p-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                        Basculer vers un utilisateur :
                      </p>
                      {users.map(user => (
                        <button
                          key={user.id}
                          onClick={() => switchUser(user)}
                          className={`w-full text-left px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm ${
                            selectedUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                              {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Centre de notifications */}
              <MobileNotificationCenter />
            </div>

            {/* Deuxième ligne - Contrôles de visualisation */}
            <div className="flex items-center gap-3 justify-between">
              {/* Orientation + Zoom + Cadre */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleOrientation}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title={orientation === 'portrait' ? 'Passer en paysage' : 'Passer en portrait'}
                >
                  <span className="text-lg">{orientation === 'portrait' ? '📱' : '🔄'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Zoom:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-16"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8 text-center">
                    {Math.round(scale * 100)}%
                  </span>
                </div>

                <button
                  onClick={() => setShowDeviceFrame(!showDeviceFrame)}
                  className={`px-3 py-2 rounded transition-colors ${
                    showDeviceFrame
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                  title={showDeviceFrame ? 'Masquer le cadre' : 'Afficher le cadre'}
                >
                  <span className="text-base">📱</span>
                </button>
              </div>

              {/* Mode sombre + Réseau */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`px-3 py-2 rounded transition-colors ${
                    isDarkMode
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                  title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
                >
                  <span className="text-base">{isDarkMode ? '🌙' : '☀️'}</span>
                </button>

                <select
                  value={networkSpeed}
                  onChange={(e) => setNetworkSpeed(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  title="Vitesse réseau"
                >
                  <option value="fast">📶 Rapide</option>
                  <option value="slow">📶 Lent</option>
                  <option value="offline">📵 Hors ligne</option>
                </select>
              </div>

              {/* Contrôles de l'application */}
              <div className="flex items-center gap-2">
                {emulatorType === 'flutter' ? (
                  <>
                    <button
                      onClick={() => {
                        fetch('http://localhost:8090/api/reload', { method: 'POST' })
                          .then(() => addLog('Rechargement Flutter demandé', 'info'))
                          .catch(err => addLog(`Erreur rechargement: ${err.message}`, 'error'));
                      }}
                      className="px-2 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      title="Recharger Flutter"
                    >
                      <span className="text-sm">🔄</span>
                    </button>
                    <button
                      onClick={() => {
                        fetch('http://localhost:8090/api/hot-restart', { method: 'POST' })
                          .then(() => addLog('Hot restart Flutter demandé', 'info'))
                          .catch(err => addLog(`Erreur hot restart: ${err.message}`, 'error'));
                      }}
                      className="px-2 py-2 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
                      title="Hot Restart Flutter"
                    >
                      <span className="text-sm">⚡</span>
                    </button>
                    <button
                      onClick={() => {
                        addLog('Ouverture Dev Menu Flutter', 'info');
                      }}
                      className="px-2 py-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                      title="Menu développeur Flutter"
                    >
                      <span className="text-sm">⚙️</span>
                    </button>
                  </>
                ) : (
                  <>
                    {appRunning ? (
                      <>
                        <button
                          onClick={restartApp}
                          className="px-2 py-2 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
                          title="Redémarrer l'application"
                        >
                          <span className="text-sm">🔄</span>
                        </button>
                        <button
                          onClick={stopApp}
                          className="px-2 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                          title="Arrêter l'application"
                        >
                          <span className="text-sm">⏹️</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={startApp}
                        className="px-2 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                        title="Démarrer l'application"
                      >
                        <span className="text-sm">▶️</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Boutons monitoring et logs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMonitoring(!showMonitoring)}
                  className={`px-3 py-2 rounded transition-colors ${
                    showMonitoring
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                  title={showMonitoring ? 'Masquer le monitoring' : 'Afficher le monitoring'}
                >
                  <span className="text-sm">📊</span>
                </button>

                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className={`px-3 py-2 rounded transition-colors flex items-center gap-1 ${
                    showLogs
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                  title="Afficher/masquer les logs"
                >
                  <span className="text-sm">📋</span>
                  {logs.length > 0 && <span className="text-xs">({logs.length})</span>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Layout principal avec émulateur et monitoring côte à côte */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Emulator Area */}
          <div className="flex-1 p-3 sm:p-8 overflow-auto">
            <div className="flex justify-center items-start min-h-full">
              <div
                style={{
                  width: showDeviceFrame ? width + 40 : width,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top center',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Device Frame */}
                <div className={`relative ${showDeviceFrame ? (isDarkMode ? 'bg-gray-900' : 'bg-gray-800') : ''} ${showDeviceFrame ? 'rounded-[3rem] p-3 shadow-2xl' : ''}`}>
                  {showDeviceFrame && (
                    <>
                      {/* Notch (pour iOS) */}
                      {selectedDevice.os === 'iOS' && orientation === 'portrait' && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-3xl z-10"></div>
                      )}
                      {/* Power Button */}
                      <div className={`absolute ${orientation === 'portrait' ? 'right-0 top-32' : 'top-0 right-32'} w-1 h-16 bg-gray-700 rounded-l`}></div>
                      {/* Volume Buttons */}
                      <div className={`absolute ${orientation === 'portrait' ? 'left-0 top-24' : 'top-0 left-24'} w-1 h-12 bg-gray-700 rounded-r`}></div>
                      <div className={`absolute ${orientation === 'portrait' ? 'left-0 top-40' : 'top-0 left-40'} w-1 h-12 bg-gray-700 rounded-r`}></div>
                    </>
                  )}

                  {/* Screen */}
                  <div className={`relative overflow-hidden ${showDeviceFrame ? 'rounded-[2.5rem]' : 'rounded-lg shadow-2xl'} ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
                    {/* Status Bar */}
                    <div className={`absolute top-0 left-0 right-0 h-11 ${isDarkMode ? 'bg-black/90 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm'} z-20 flex items-center justify-between px-6 text-xs ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">9:41</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">📶</span>
                          <span className={`text-xs ${networkSpeed === 'fast' ? 'text-green-500' : networkSpeed === 'slow' ? 'text-yellow-500' : 'text-red-500'}`}>
                            {networkSpeed === 'fast' ? 'LTE' : networkSpeed === 'slow' ? '3G' : '✕'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">🔋</span>
                        <span className="text-xs">100%</span>
                        <div className="w-4 h-2 bg-green-500 rounded-sm"></div>
                      </div>
                    </div>

                    {/* App Content Container - Scrollable */}
                    <div
                      className="relative overflow-hidden"
                      style={{
                        width: `${width}px`,
                        height: `${height}px`,
                        paddingTop: '44px'
                      }}
                    >
                      {/* App Stopped Overlay */}
                      {!appRunning && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center">
                          <div className="text-center text-white">
                            <div className="text-6xl mb-4 animate-pulse">⏸️</div>
                            <p className="text-xl font-semibold mb-2">Application arrêtée</p>
                            <p className="text-sm text-gray-300 mb-4">Cliquez sur le bouton de démarrage pour relancer</p>
                            <button
                              onClick={startApp}
                              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                            >
                              ▶️ Démarrer l'application
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Touch Effect */}
                      {touchEffect && emulatorType === 'web' && (
                        <div
                          className="absolute pointer-events-none z-50"
                          style={{
                            left: touchEffect.x,
                            top: touchEffect.y,
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          <div className="w-12 h-12 rounded-full bg-blue-500 opacity-40 animate-pulse"></div>
                          <div className="absolute inset-0 w-12 h-12 rounded-full bg-blue-400 opacity-20 animate-ping"></div>
                        </div>
                      )}

                      {/* Content Area - Switch between Web and React Native */}
                      {emulatorType === 'react-native' ? (
                        // React Native via iframe
                        <iframe
                          src="http://localhost:8090"
                          className="w-full h-full border-0"
                          style={{
                            transform: 'scale(1)',
                            transformOrigin: 'top left',
                          }}
                          title="React Native App"
                        />
                      ) : (
                        // Web version
                        <div
                          className="h-full overflow-y-auto overflow-x-hidden relative"
                          style={{
                            // Style pour simuler le comportement mobile
                            WebkitOverflowScrolling: 'touch',
                            scrollbarWidth: 'none', // Firefox
                            msOverflowStyle: 'none', // IE/Edge
                          }}
                          onScroll={(e) => {
                            const scrollTop = e.currentTarget.scrollTop;
                            const scrollHeight = e.currentTarget.scrollHeight;
                            const clientHeight = e.currentTarget.clientHeight;

                            // Ajouter un indicateur de scroll subtil
                            if (scrollHeight > clientHeight) {
                              e.currentTarget.style.setProperty('--scroll-indicator-opacity', String(Math.min(scrollTop / 50, 1)));
                            }
                          }}
                        >
                          <MobileApp
                            currentScreen={currentScreen}
                            setCurrentScreen={setCurrentScreen}
                            selectedUser={selectedUser}
                            mobileToken={mobileToken}
                            applications={applications}
                            loadingData={loadingData}
                            isDarkMode={isDarkMode}
                            loginAsUser={loginAsUser}
                            logout={logout}
                            width={width}
                            height={height - 44}
                            onTouchStart={(x, y) => {
                              setTouchEffect({ x, y });
                              // Vibration simulée
                              if (navigator.vibrate) {
                                navigator.vibrate(10);
                              }
                            }}
                            onTouchEnd={() => {
                              setTimeout(() => setTouchEffect(null), 200);
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Home Indicator (iOS) */}
                    {showDeviceFrame && selectedDevice.os === 'iOS' && orientation === 'portrait' && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white opacity-50 rounded-full"></div>
                    )}
                  </div>
                </div>

                {/* Device Info */}
                <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium">
                    {selectedDevice.name} - {width}x{height}px - {orientation === 'portrait' ? 'Portrait' : 'Paysage'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Monitoring Panel - Desktop Only */}
          {showMonitoring && (
            <div className="hidden lg:block w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-6 overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-900 pb-4 mb-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    Monitoring en temps réel
                  </h2>
                  <button
                    onClick={() => setShowMonitoring(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Masquer le monitoring"
                  >
                    <span className="text-lg">←</span>
                  </button>
                </div>
              </div>

              {/* Métriques principales */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">8</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Services actifs</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">95%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Disponibilité</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">120ms</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Temps de réponse</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">1.8K</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Requêtes/min</div>
                </div>
              </div>

              {/* Graphiques miniatures */}
              <div className="grid grid-cols-1 gap-4 mb-6">
                {/* Graphique CPU */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Utilisation CPU</h3>
                  <div className="h-20 flex items-end justify-between gap-1">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-blue-500 rounded-t min-h-[4px]"
                        style={{ height: `${Math.random() * 60 + 20}%`, width: '6px' }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                    <span>0%</span>
                    <span>75%</span>
                  </div>
                </div>

                {/* Graphique Mémoire */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Utilisation Mémoire</h3>
                  <div className="h-20 flex items-end justify-between gap-1">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-green-500 rounded-t min-h-[4px]"
                        style={{ height: `${Math.random() * 40 + 30}%`, width: '6px' }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                    <span>512MB</span>
                    <span>1.2GB</span>
                  </div>
                </div>
              </div>

              {/* Activité récente */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Activité récente</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Application Service redémarré</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">Il y a 2min</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Nouvelle candidature créée</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">Il y a 5min</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Entretien planifié</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">Il y a 8min</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panneau de logs */}
        {showLogs && (
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span>📋</span>
                  Logs de l'émulateur
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={clearLogs}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                  >
                    Effacer
                  </button>
                  <button
                    onClick={() => setShowLogs(false)}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                  >
                    Fermer
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
                {logs.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">Aucun log disponible</p>
                ) : (
                  logs.map((log, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 p-2 rounded ${
                        log.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' :
                        log.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="text-gray-500 dark:text-gray-400 shrink-0">{log.time}</span>
                      <span className="shrink-0">
                        {log.type === 'error' ? '❌' : log.type === 'success' ? '✅' : 'ℹ️'}
                      </span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Emulator Area */}
        <div className="flex-1 p-3 sm:p-8 overflow-auto">
          <div className="flex justify-center items-start min-h-full">
            <div
              style={{
                width: showDeviceFrame ? width + 40 : width,
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Device Frame */}
              <div className={`relative ${showDeviceFrame ? (isDarkMode ? 'bg-gray-900' : 'bg-gray-800') : ''} ${showDeviceFrame ? 'rounded-[3rem] p-3 shadow-2xl' : ''}`}>
                {showDeviceFrame && (
                  <>
                    {/* Notch (pour iOS) */}
                    {selectedDevice.os === 'iOS' && orientation === 'portrait' && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-3xl z-10"></div>
                    )}
                    {/* Power Button */}
                    <div className={`absolute ${orientation === 'portrait' ? 'right-0 top-32' : 'top-0 right-32'} w-1 h-16 bg-gray-700 rounded-l`}></div>
                    {/* Volume Buttons */}
                    <div className={`absolute ${orientation === 'portrait' ? 'left-0 top-24' : 'top-0 left-24'} w-1 h-12 bg-gray-700 rounded-r`}></div>
                    <div className={`absolute ${orientation === 'portrait' ? 'left-0 top-40' : 'top-0 left-40'} w-1 h-12 bg-gray-700 rounded-r`}></div>
                  </>
                )}

                {/* Screen */}
                <div className={`relative overflow-hidden ${showDeviceFrame ? 'rounded-[2.5rem]' : 'rounded-lg shadow-2xl'} ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
                  {/* Status Bar */}
                  <div className={`absolute top-0 left-0 right-0 h-11 ${isDarkMode ? 'bg-black/90 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm'} z-20 flex items-center justify-between px-6 text-xs ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">9:41</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs">📶</span>
                        <span className={`text-xs ${networkSpeed === 'fast' ? 'text-green-500' : networkSpeed === 'slow' ? 'text-yellow-500' : 'text-red-500'}`}>
                          {networkSpeed === 'fast' ? 'LTE' : networkSpeed === 'slow' ? '3G' : '✕'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">🔋</span>
                      <span className="text-xs">100%</span>
                      <div className="w-4 h-2 bg-green-500 rounded-sm"></div>
                    </div>
                  </div>

                  {/* App Content Container - Scrollable */}
                  <div
                    className="relative overflow-hidden"
                    style={{
                      width: `${width}px`,
                      height: `${height}px`,
                      paddingTop: '44px'
                    }}
                  >
                    {/* App Stopped Overlay */}
                    {!appRunning && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center">
                        <div className="text-center text-white">
                          <div className="text-6xl mb-4 animate-pulse">⏸️</div>
                          <p className="text-xl font-semibold mb-2">Application arrêtée</p>
                          <p className="text-sm text-gray-300 mb-4">Cliquez sur le bouton de démarrage pour relancer</p>
                          <button
                            onClick={startApp}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                          >
                            ▶️ Démarrer l'application
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Touch Effect */}
                    {touchEffect && emulatorType === 'web' && (
                      <div
                        className="absolute pointer-events-none z-50"
                        style={{
                          left: touchEffect.x,
                          top: touchEffect.y,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <div className="w-12 h-12 rounded-full bg-blue-500 opacity-40 animate-pulse"></div>
                        <div className="absolute inset-0 w-12 h-12 rounded-full bg-blue-400 opacity-20 animate-ping"></div>
                      </div>
                    )}

                    {/* Content Area - Switch between Web and React Native */}
                    {emulatorType === 'react-native' ? (
                      // React Native via iframe
                      <iframe
                        src="http://localhost:8090"
                        className="w-full h-full border-0"
                        style={{
                          transform: 'scale(1)',
                          transformOrigin: 'top left',
                        }}
                        title="React Native App"
                      />
                    ) : (
                      // Web version
                      <div
                        className="h-full overflow-y-auto overflow-x-hidden relative"
                        style={{
                          // Style pour simuler le comportement mobile
                          WebkitOverflowScrolling: 'touch',
                          scrollbarWidth: 'none', // Firefox
                          msOverflowStyle: 'none', // IE/Edge
                        }}
                        onScroll={(e) => {
                          const scrollTop = e.currentTarget.scrollTop;
                          const scrollHeight = e.currentTarget.scrollHeight;
                          const clientHeight = e.currentTarget.clientHeight;

                          // Ajouter un indicateur de scroll subtil
                          if (scrollHeight > clientHeight) {
                            e.currentTarget.style.setProperty('--scroll-indicator-opacity', String(Math.min(scrollTop / 50, 1)));
                          }
                        }}
                      >
                        <MobileApp
                          currentScreen={currentScreen}
                          setCurrentScreen={setCurrentScreen}
                          selectedUser={selectedUser}
                          mobileToken={mobileToken}
                          applications={applications}
                          loadingData={loadingData}
                          isDarkMode={isDarkMode}
                          loginAsUser={loginAsUser}
                          logout={logout}
                          width={width}
                          height={height - 44}
                          onTouchStart={(x, y) => {
                            setTouchEffect({ x, y });
                            // Vibration simulée
                            if (navigator.vibrate) {
                              navigator.vibrate(10);
                            }
                          }}
                          onTouchEnd={() => {
                            setTimeout(() => setTouchEffect(null), 200);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Home Indicator (iOS) */}
                  {showDeviceFrame && selectedDevice.os === 'iOS' && orientation === 'portrait' && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white opacity-50 rounded-full"></div>
                  )}
                </div>
              </div>

              {/* Device Info */}
              <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium">
                  {selectedDevice.name} - {width}x{height}px - {orientation === 'portrait' ? 'Portrait' : 'Paysage'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-xl">{emulatorType === 'flutter' ? '🚀' : '🌐'}</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {emulatorType === 'flutter' ? 'Flutter Natif' : 'Émulateur Mobile Web'}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    {emulatorType === 'flutter'
                      ? 'Exécute du vrai code Flutter dans un conteneur avec Hot Reload'
                      : 'Testez l\'application avec différents utilisateurs et appareils'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-xl">👤</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Utilisateur actuel</p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    {selectedUser ? `${selectedUser.email} (${selectedUser.role})` : 'Aucun utilisateur connecté'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-xl">📱</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {emulatorType === 'flutter' ? 'Code Flutter' : 'Retour tactile'}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    {emulatorType === 'flutter'
                      ? 'Application Flutter complète avec Hot Reload et Material Design'
                      : 'Cliquez sur l\'écran pour simuler des interactions tactiles'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

// Composant de l'application mobile simulée
function MobileApp({
  currentScreen,
  setCurrentScreen,
  selectedUser,
  mobileToken,
  applications,
  loadingData,
  isDarkMode,
  loginAsUser,
  logout,
  width,
  height,
  onTouchStart,
  onTouchEnd
}: {
  currentScreen: MobileScreen
  setCurrentScreen: (screen: MobileScreen) => void
  selectedUser: User | null
  mobileToken: string | null
  applications: Application[]
  loadingData: boolean
  isDarkMode: boolean
  loginAsUser: (email: string, password: string) => void
  logout: () => void
  width: number
  height: number
  onTouchStart?: (x: number, y: number) => void
  onTouchEnd?: () => void
}) {
  // État local pour les champs de formulaire
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('password123')

  // Mettre à jour les champs de login quand l'utilisateur sélectionné change
  useEffect(() => {
    if (selectedUser) {
      setLoginEmail(selectedUser.email)
      setLoginPassword('password123') // Mot de passe par défaut
    } else {
      setLoginEmail('user1@jobbingtrack.test') // Utilisateur par défaut
      setLoginPassword('password123')
    }
  }, [selectedUser])

  const bgClass = isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
  const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-900'
  const cardClass = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'

  // Gestionnaire d'événements tactiles pour simuler l'utilisation mobile
  const handleTouchStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onTouchStart) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      onTouchStart(x, y)
    }
  }

  const handleTouchEnd = () => {
    if (onTouchEnd) {
      onTouchEnd()
    }
  }

  if (currentScreen === 'login') {
    return (
      <div
        className={`${bgClass} ${textClass} w-full h-full flex flex-col items-center justify-center p-8`}
        onClick={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        <div className="text-6xl mb-4 animate-bounce">🎯</div>
        <h1 className="text-3xl font-bold mb-2">JobbingTrack</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Suivez vos candidatures facilement</p>

        <div className="w-full max-w-sm space-y-4">
          <div className="relative">
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email"
              className={`w-full px-4 py-3 pr-12 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                selectedUser
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                  : isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
              }`}
            />
            {selectedUser && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                Pré-rempli
              </div>
            )}
          </div>

          <div className="relative">
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Mot de passe"
              className={`w-full px-4 py-3 pr-12 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                selectedUser
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                  : isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
              }`}
            />
            {selectedUser && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                Pré-rempli
              </div>
            )}
          </div>

          <button
            onClick={() => loginAsUser(loginEmail, loginPassword)}
            disabled={loadingData}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transform transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {loadingData ? '🔄 Connexion...' : 'Se connecter'}
          </button>
        </div>
        
        <div className="mt-8 text-xs text-gray-500 dark:text-gray-400 text-center">
          {selectedUser ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="font-medium text-blue-800 dark:text-blue-300">
                Utilisateur sélectionné : {selectedUser.firstName} {selectedUser.lastName}
              </p>
              <p className="mt-1">Les champs de connexion sont automatiquement pré-remplis.</p>
              <p className="mt-1 text-green-600 dark:text-green-400 font-medium">
                {loadingData ? '🔄 Connexion en cours...' : '✅ Prêt à se connecter'}
              </p>
            </div>
          ) : (
            <>
              <p>Comptes de test :</p>
              <p>user1@jobbingtrack.test • user2@jobbingtrack.test • user3@jobbingtrack.test</p>
              <p className="mt-1">Mot de passe : password123</p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (currentScreen === 'home') {
    return (
      <div
        className={`${bgClass} w-full h-full flex flex-col`}
        onClick={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {/* Header */}
        <div className={`${cardClass} border-b p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">Bonjour {selectedUser?.firstName} 👋</h1>
            <button
              onClick={logout}
              className="text-2xl hover:scale-110 transition-transform duration-200"
            >
              🚪
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gérez vos candidatures en un coup d'œil
          </p>
        </div>

        {/* Stats */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className={`${cardClass} border p-4 rounded-lg hover:shadow-lg transition-all duration-200`}>
            <p className="text-3xl font-bold text-blue-600">{applications.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Candidatures</p>
          </div>
          <div className={`${cardClass} border p-4 rounded-lg hover:shadow-lg transition-all duration-200`}>
            <p className="text-3xl font-bold text-green-600">{applications.filter(a => a.status === 'INTERVIEW_SCHEDULED').length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Entretiens</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4">
          <h2 className="font-semibold mb-3">Actions rapides</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCurrentScreen('applications')}
              className="bg-blue-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 hover:bg-blue-700 transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <span className="text-3xl">📝</span>
              <span className="text-sm font-medium">Candidatures</span>
            </button>
            <button
              onClick={() => setCurrentScreen('companies')}
              className="bg-purple-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 hover:bg-purple-700 transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <span className="text-3xl">🏢</span>
              <span className="text-sm font-medium">Entreprises</span>
            </button>
            <button
              onClick={() => setCurrentScreen('contacts')}
              className="bg-green-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 hover:bg-green-700 transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <span className="text-3xl">👤</span>
              <span className="text-sm font-medium">Contacts</span>
            </button>
            <button
              onClick={() => setCurrentScreen('interviews')}
              className="bg-orange-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 hover:bg-orange-700 transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <span className="text-3xl">📅</span>
              <span className="text-sm font-medium">Entretiens</span>
            </button>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} isDarkMode={isDarkMode} selectedUser={selectedUser} />
      </div>
    )
  }

  if (currentScreen === 'applications') {
    return (
      <div
        className={`${bgClass} w-full h-full flex flex-col`}
        onClick={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {/* Header */}
        <div className={`${cardClass} border-b p-4`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen('home')}
              className="text-2xl hover:scale-110 transition-transform duration-200"
            >
              ←
            </button>
            <h1 className="text-xl font-bold">Mes Candidatures</h1>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 mobile-scroll relative">
          {/* Indicateur de scroll subtil */}
          <div className="scroll-indicator"></div>
          {loadingData ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Chargement...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-2 animate-bounce">📭</p>
              <p className="text-gray-500 dark:text-gray-400">Aucune candidature</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Les candidatures apparaîtront ici</p>
            </div>
          ) : (
            applications.map((app, index) => (
              <div
                key={index}
                className={`${cardClass} border p-4 rounded-lg hover:shadow-lg transition-all duration-200 cursor-pointer`}
                onClick={() => {
                  // Simulation d'ouverture de détail (pourrait ouvrir un modal ou une autre vue)
                  console.log('Ouverture candidature:', app.id);
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{app.position}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{app.company.name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ml-2 ${
                    app.status === 'INTERVIEW_SCHEDULED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    app.status === 'SENT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {app.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>📅 {new Date().toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      <span>👁️</span>
                      <span>Voir détails</span>
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <BottomNav currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} isDarkMode={isDarkMode} selectedUser={selectedUser} />
      </div>
    )
  }

  // Écran Admin Backoffice (Super Admin uniquement)
  if (currentScreen === 'admin-backoffice') {
    return (
      <div className={`${bgClass} w-full h-full flex flex-col`}>
        {/* Header avec option de retour */}
        <div className={`${cardClass} border-b p-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentScreen('home')}
              className="text-xl hover:scale-110 transition-transform duration-200"
            >
              ←
            </button>
            <h1 className="text-lg font-bold">Admin Backoffice</h1>
          </div>
          <button
            onClick={() => {
              // Basculer en plein écran web
              window.open('http://localhost:8080/backoffice', '_blank')
            }}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
          >
            🖥️ Version Web
          </button>
        </div>
        
        {/* Iframe du backoffice web adapté au mobile */}
        <div className="flex-1 overflow-hidden relative">
          <iframe
            src="http://localhost:8080/backoffice"
            className="w-full h-full border-0"
            style={{
              transform: 'scale(1)',
              transformOrigin: 'top left',
            }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            title="Admin Backoffice"
          />
        </div>
        
        <BottomNav currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} isDarkMode={isDarkMode} selectedUser={selectedUser} />
      </div>
    )
  }

  // Autres écrans
  return (
    <div
      className={`${bgClass} w-full h-full flex flex-col`}
      onClick={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      <div className={`${cardClass} border-b p-4`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentScreen('home')}
            className="text-2xl hover:scale-110 transition-transform duration-200"
          >
            ←
          </button>
          <h1 className="text-xl font-bold capitalize">{currentScreen}</h1>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-6xl mb-4 animate-pulse">🚧</p>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Écran en développement</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Cette fonctionnalité sera bientôt disponible
          </p>
        </div>
      </div>
      <BottomNav currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} isDarkMode={isDarkMode} selectedUser={selectedUser} />
    </div>
  )
}

function BottomNav({ currentScreen, setCurrentScreen, isDarkMode, selectedUser }: {
  currentScreen: MobileScreen
  setCurrentScreen: (screen: MobileScreen) => void
  isDarkMode: boolean
  selectedUser?: User | null
}) {
  const navItems = [
    { screen: 'home' as MobileScreen, icon: '🏠', label: 'Accueil' },
    { screen: 'applications' as MobileScreen, icon: '📝', label: 'Candidatures' },
    { screen: 'interviews' as MobileScreen, icon: '📅', label: 'Entretiens' },
    { screen: 'profile' as MobileScreen, icon: '👤', label: 'Profil' },
  ]
  // Ajouter le backoffice pour les Super Admin
  const isAdmin = selectedUser?.role === 'SUPER_ADMIN' || selectedUser?.role === 'ADMIN'

  if (isAdmin && currentScreen !== 'login') {
    navItems.push({ screen: 'admin-backoffice' as MobileScreen, icon: '⚙️', label: 'Admin' })
  }

  return (
    <div className={`${isDarkMode ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-200'} border-t backdrop-blur-sm sticky bottom-0 left-0 right-0 z-30 shadow-lg`}>
      {/* Navigation scrollable horizontalement */}
      <div className="flex overflow-x-auto scrollbar-hide p-2 gap-1">
        {navItems.map(item => (
          <button
            key={item.screen}
            onClick={() => setCurrentScreen(item.screen)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
              currentScreen === item.screen
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 transform scale-110'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
