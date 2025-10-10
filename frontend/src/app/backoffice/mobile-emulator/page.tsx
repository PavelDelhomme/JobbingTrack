'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import axios from 'axios'

type DeviceType = 'iphone-14' | 'iphone-14-pro-max' | 'pixel-7' | 'samsung-s23' | 'ipad'
type OrientationType = 'portrait' | 'landscape'
type MobileScreen = 'login' | 'home' | 'applications' | 'companies' | 'contacts' | 'interviews' | 'profile' | 'settings'

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
  const { user: adminUser } = useAuth()
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

  const width = orientation === 'portrait' ? selectedDevice.width : selectedDevice.height
  const height = orientation === 'portrait' ? selectedDevice.height : selectedDevice.width

  // Charger les utilisateurs disponibles
  useEffect(() => {
    loadUsers()
  }, [])

  // Auto-login si déjà un utilisateur sélectionné
  useEffect(() => {
    if (selectedUser && !mobileToken) {
      loginAsUser(selectedUser.email)
    }
  }, [selectedUser])

  // Charger les données quand on est connecté
  useEffect(() => {
    if (mobileToken && currentScreen !== 'login') {
      loadApplications()
    }
  }, [mobileToken, currentScreen])

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/auth/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      if (response.data.success) {
        setUsers(response.data.users || [])
      }
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error)
      // Créer des utilisateurs de test
      setUsers([
        { id: '1', email: 'user1@jobbingtrack.com', firstName: 'Pavel', lastName: 'Delhomme', role: 'SUPER_ADMIN' },
        { id: '2', email: 'user2@jobbingtrack.com', firstName: 'Marie', lastName: 'Martin', role: 'ADMIN' },
        { id: '3', email: 'user3@jobbingtrack.com', firstName: 'Thomas', lastName: 'Bernard', role: 'USER' },
      ])
    }
  }

  const loginAsUser = async (email: string, password: string = 'password123') => {
    setLoadingData(true)
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
      }
    } catch (error: any) {
      console.error('Erreur login:', error)
      alert(`Erreur de connexion: ${error.message}`)
    } finally {
      setLoadingData(false)
    }
  }

  const loadApplications = async () => {
    if (!mobileToken) return
    setLoadingData(true)
    try {
      const response = await axios.get(`${API_URL}/api/v1/applications`, {
        headers: { Authorization: `Bearer ${mobileToken}` }
      })
      if (response.data.success) {
        setApplications(response.data.applications || [])
      }
    } catch (error) {
      console.error('Erreur chargement candidatures:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleScreenTouch = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Effet tactile
    setTouchEffect({ x, y })
    setTimeout(() => setTouchEffect(null), 300)
    
    // Vibration simulée
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  const logout = () => {
    setMobileToken(null)
    setSelectedUser(null)
    setCurrentScreen('login')
    setApplications([])
  }

  const switchUser = (user: User) => {
    logout()
    setSelectedUser(user)
    setShowUserSwitcher(false)
    setTimeout(() => loginAsUser(user.email), 100)
  }

  const toggleOrientation = () => {
    setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')
  }

  return (
    <AdminLayout>
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Device Selector */}
            <div className="flex-shrink-0">
              <select
                value={selectedDevice.id}
                onChange={(e) => {
                  const device = DEVICES.find(d => d.id === e.target.value)
                  if (device) setSelectedDevice(device)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                {DEVICES.map(device => (
                  <option key={device.id} value={device.id}>
                    {device.icon} {device.name} ({device.os})
                  </option>
                ))}
              </select>
            </div>

            {/* User Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowUserSwitcher(!showUserSwitcher)}
                className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center gap-2"
              >
                <span className="text-xl">👤</span>
                <span className="text-sm font-medium">
                  {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'Choisir utilisateur'}
                </span>
                <span className="text-xs">▼</span>
              </button>

              {showUserSwitcher && (
                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 min-w-[250px]">
                  <div className="p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2">
                      Basculer vers un utilisateur :
                    </p>
                    {users.map(user => (
                      <button
                        key={user.id}
                        onClick={() => switchUser(user)}
                        className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          selectedUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {user.firstName[0]}{user.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {user.email} • {user.role}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <button
              onClick={toggleOrientation}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <span className="text-xl">{orientation === 'portrait' ? '📱' : '🔄'}</span>
              <span className="text-sm font-medium dark:text-gray-200">
                {orientation === 'portrait' ? 'Portrait' : 'Paysage'}
              </span>
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
                className="w-32"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12">
                {Math.round(scale * 100)}%
              </span>
            </div>

            <button
              onClick={() => setShowDeviceFrame(!showDeviceFrame)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showDeviceFrame
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="text-xl mr-2">📱</span>
              <span className="text-sm font-medium">Cadre</span>
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="text-xl">{isDarkMode ? '🌙' : '☀️'}</span>
            </button>

            <select
              value={networkSpeed}
              onChange={(e) => setNetworkSpeed(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="fast">📶 4G Rapide</option>
              <option value="slow">📶 3G Lent</option>
              <option value="offline">📵 Hors ligne</option>
            </select>
          </div>
        </div>

        {/* Emulator Area */}
        <div className="flex-1 p-8 overflow-auto">
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
                  <div className={`absolute top-0 left-0 right-0 h-11 ${isDarkMode ? 'bg-black' : 'bg-white'} z-20 flex items-center justify-between px-6 text-xs ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <span>{networkSpeed === 'fast' ? '📶' : networkSpeed === 'slow' ? '📶📶' : '📵'}</span>
                      <span>🔋</span>
                    </div>
                  </div>

                  {/* App Content */}
                  <div
                    onClick={handleScreenTouch}
                    className="relative"
                    style={{
                      width: `${width}px`,
                      height: `${height}px`,
                      paddingTop: '44px'
                    }}
                  >
                    {/* Touch Effect */}
                    {touchEffect && (
                      <div
                        className="absolute pointer-events-none z-50"
                        style={{
                          left: touchEffect.x,
                          top: touchEffect.y,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <div className="w-16 h-16 rounded-full bg-blue-500 opacity-30 animate-ping"></div>
                      </div>
                    )}

                    {/* Screen Content */}
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
                    />
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
                <span className="text-xl">🎯</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Émulateur Mobile Complet</p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    Testez l'application avec différents utilisateurs et appareils
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
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Retour tactile</p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    Cliquez sur l'écran pour simuler des interactions tactiles
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
function MobileApp({ currentScreen, setCurrentScreen, selectedUser, mobileToken, applications, loadingData, isDarkMode, loginAsUser, logout, width, height }: {
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
}) {
  const [loginEmail, setLoginEmail] = useState('user1@jobbingtrack.com')
  const [loginPassword, setLoginPassword] = useState('password123')

  const bgClass = isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
  const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-900'
  const cardClass = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'

  if (currentScreen === 'login') {
    return (
      <div className={`${bgClass} ${textClass} w-full h-full flex flex-col items-center justify-center p-8`}>
        <div className="text-6xl mb-4">🎯</div>
        <h1 className="text-3xl font-bold mb-2">JobbingTrack</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Suivez vos candidatures facilement</p>
        
        <div className="w-full max-w-sm space-y-4">
          <input
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            placeholder="Email"
            className={`w-full px-4 py-3 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
          />
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Mot de passe"
            className={`w-full px-4 py-3 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
          />
          <button
            onClick={() => loginAsUser(loginEmail, loginPassword)}
            disabled={loadingData}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingData ? '🔄 Connexion...' : 'Se connecter'}
          </button>
        </div>
        
        <div className="mt-8 text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>Comptes de test :</p>
          <p>user1@jobbingtrack.com • user2@jobbingtrack.com • user3@jobbingtrack.com</p>
          <p className="mt-1">Mot de passe : password123</p>
        </div>
      </div>
    )
  }

  if (currentScreen === 'home') {
    return (
      <div className={`${bgClass} w-full h-full flex flex-col`}>
        {/* Header */}
        <div className={`${cardClass} border-b p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">Bonjour {selectedUser?.firstName} 👋</h1>
            <button onClick={logout} className="text-2xl">🚪</button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gérez vos candidatures en un coup d'œil
          </p>
        </div>

        {/* Stats */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className={`${cardClass} border p-4 rounded-lg`}>
            <p className="text-3xl font-bold text-blue-600">{applications.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Candidatures</p>
          </div>
          <div className={`${cardClass} border p-4 rounded-lg`}>
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
              className="bg-blue-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 hover:bg-blue-700"
            >
              <span className="text-3xl">📝</span>
              <span className="text-sm font-medium">Candidatures</span>
            </button>
            <button
              onClick={() => setCurrentScreen('companies')}
              className="bg-purple-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 hover:bg-purple-700"
            >
              <span className="text-3xl">🏢</span>
              <span className="text-sm font-medium">Entreprises</span>
            </button>
            <button
              onClick={() => setCurrentScreen('contacts')}
              className="bg-green-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 hover:bg-green-700"
            >
              <span className="text-3xl">👤</span>
              <span className="text-sm font-medium">Contacts</span>
            </button>
            <button
              onClick={() => setCurrentScreen('interviews')}
              className="bg-orange-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 hover:bg-orange-700"
            >
              <span className="text-3xl">📅</span>
              <span className="text-sm font-medium">Entretiens</span>
            </button>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} isDarkMode={isDarkMode} />
      </div>
    )
  }

  if (currentScreen === 'applications') {
    return (
      <div className={`${bgClass} w-full h-full flex flex-col`}>
        {/* Header */}
        <div className={`${cardClass} border-b p-4`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentScreen('home')} className="text-2xl">←</button>
            <h1 className="text-xl font-bold">Mes Candidatures</h1>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loadingData ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-gray-500 dark:text-gray-400">Aucune candidature</p>
            </div>
          ) : (
            applications.map((app, index) => (
              <div key={index} className={`${cardClass} border p-4 rounded-lg`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{app.position}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{app.company.name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    app.status === 'INTERVIEW_SCHEDULED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    app.status === 'SENT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {app.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <BottomNav currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} isDarkMode={isDarkMode} />
      </div>
    )
  }

  // Autres écrans
  return (
    <div className={`${bgClass} w-full h-full flex flex-col`}>
      <div className={`${cardClass} border-b p-4`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentScreen('home')} className="text-2xl">←</button>
          <h1 className="text-xl font-bold capitalize">{currentScreen}</h1>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Écran en développement</p>
      </div>
      <BottomNav currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} isDarkMode={isDarkMode} />
    </div>
  )
}

function BottomNav({ currentScreen, setCurrentScreen, isDarkMode }: {
  currentScreen: MobileScreen
  setCurrentScreen: (screen: MobileScreen) => void
  isDarkMode: boolean
}) {
  const navItems = [
    { screen: 'home' as MobileScreen, icon: '🏠', label: 'Accueil' },
    { screen: 'applications' as MobileScreen, icon: '📝', label: 'Candidatures' },
    { screen: 'interviews' as MobileScreen, icon: '📅', label: 'Entretiens' },
    { screen: 'profile' as MobileScreen, icon: '👤', label: 'Profil' },
  ]

  return (
    <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-t flex justify-around p-2`}>
      {navItems.map(item => (
        <button
          key={item.screen}
          onClick={() => setCurrentScreen(item.screen)}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg ${
            currentScreen === item.screen
              ? 'text-blue-600'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <span className="text-xl">{item.icon}</span>
          <span className="text-xs font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  )
}
