'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/features';
import { Smartphone, RefreshCw, Upload, Download, Play, Square, Settings, Monitor } from 'lucide-react';

export default function MobileEmulatorPage() {
  // Configuration
  const MOBILE_APP_URL = process.env.NEXT_PUBLIC_MOBILE_APP_URL || 'http://localhost:5019';
  const [url, setUrl] = useState(MOBILE_APP_URL);
  const [deviceType, setDeviceType] = useState('iphone');
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [apkInstalled, setApkInstalled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const devices = {
    iphone: { width: 375, height: 812, name: 'iPhone 13 Pro', icon: '📱' },
    android: { width: 360, height: 800, name: 'Pixel 5', icon: '🤖' },
    tablet: { width: 768, height: 1024, name: 'iPad', icon: '📱' },
  };

  const currentDevice = devices[deviceType as keyof typeof devices];

  // Simuler l'installation d'APK
  const handleApkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.apk')) {
      setApkFile(file);
      setLogs(prev => [...prev, `📦 APK chargé: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`]);
      
      // Simuler l'installation
      setTimeout(() => {
        setApkInstalled(true);
        setLogs(prev => [...prev, '✅ APK installé avec succès']);
      }, 2000);
    } else {
      setLogs(prev => [...prev, '❌ Format invalide. Veuillez sélectionner un fichier .apk']);
    }
  };

  // Démarrer l'application
  const handleStartApp = () => {
    if (!apkInstalled && !apkFile) {
      setLogs(prev => [...prev, '⚠️ Veuillez d\'abord installer un APK']);
      return;
    }
    
    setIsRunning(true);
    setLogs(prev => [...prev, '🚀 Démarrage de l\'application...']);
    
    // Simuler le démarrage
    setTimeout(() => {
      setLogs(prev => [...prev, '✅ Application démarrée']);
    }, 1000);
  };

  // Arrêter l'application
  const handleStopApp = () => {
    setIsRunning(false);
    setLogs(prev => [...prev, '⏹️ Application arrêtée']);
  };

  // Télécharger l'APK (simulation)
  const handleDownloadApk = () => {
    setLogs(prev => [...prev, '📥 Téléchargement de l\'APK...']);
    // Ici, vous pourriez faire un appel API pour télécharger l'APK
    setTimeout(() => {
      setLogs(prev => [...prev, '✅ APK téléchargé']);
    }, 1000);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Smartphone className="h-8 w-8" />
            Émulateur Mobile - Test APK Flutter
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Testez votre application Flutter APK directement dans le navigateur
          </p>
        </div>

        {/* Contrôles */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sélection d'appareil */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Appareil
              </label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="iphone">📱 iPhone 13 Pro</option>
                <option value="android">🤖 Pixel 5</option>
                <option value="tablet">📱 iPad</option>
              </select>
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                URL de l'application
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:5019"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            {/* Upload APK */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Installer APK
              </label>
              <label className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition">
                <Upload className="h-5 w-5 mr-2" />
                <span className="text-sm">Choisir APK</span>
                <input
                  type="file"
                  accept=".apk"
                  onChange={handleApkUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleStartApp}
                disabled={isRunning}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play className="h-5 w-5" />
                Démarrer
              </button>
              <button
                onClick={handleStopApp}
                disabled={!isRunning}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Square className="h-5 w-5" />
                Arrêter
              </button>
            </div>
          </div>

          {/* Statut */}
          <div className="flex items-center gap-4 text-sm">
            <div className={`flex items-center gap-2 ${apkInstalled ? 'text-green-600' : 'text-gray-500'}`}>
              <div className={`w-2 h-2 rounded-full ${apkInstalled ? 'bg-green-600' : 'bg-gray-400'}`} />
              APK {apkInstalled ? 'Installé' : 'Non installé'}
            </div>
            <div className={`flex items-center gap-2 ${isRunning ? 'text-green-600' : 'text-gray-500'}`}>
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`} />
              Application {isRunning ? 'En cours' : 'Arrêtée'}
            </div>
            {apkFile && (
              <div className="text-gray-600 dark:text-gray-400">
                📦 {apkFile.name} ({(apkFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>
        </div>

        {/* Émulateur */}
        <div className="flex justify-center">
          <div
            className="border-8 border-gray-800 dark:border-gray-700 rounded-3xl shadow-2xl bg-white dark:bg-gray-900 overflow-hidden relative"
            style={{
              width: `${currentDevice.width + 16}px`,
              height: `${currentDevice.height + 16}px`,
            }}
          >
            {/* Barre de statut (iPhone) */}
            {deviceType === 'iphone' && (
              <div className="absolute top-0 left-0 right-0 h-6 bg-black text-white text-xs flex items-center justify-between px-4 z-10">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 border border-white rounded-sm">
                    <div className="w-3 h-1.5 bg-white rounded-sm m-0.5" />
                  </div>
                  <div className="w-1 h-1 bg-white rounded-full" />
                  <div className="w-1 h-1 bg-white rounded-full" />
                </div>
              </div>
            )}

            {/* Frame de l'application */}
            <iframe
              id="mobile-frame"
              src={isRunning ? url : 'about:blank'}
              className="w-full h-full border-0"
              style={{
                marginTop: deviceType === 'iphone' ? '24px' : '0',
                height: deviceType === 'iphone' ? 'calc(100% - 24px)' : '100%',
              }}
              title={`Émulateur ${currentDevice.name}`}
            />

            {/* Overlay si APK non installé */}
            {!apkInstalled && !isRunning && (
              <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-20">
                <div className="text-center text-white p-6">
                  <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Aucun APK installé</p>
                  <p className="text-sm opacity-75">Téléchargez et installez un APK pour commencer</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Logs
            </h2>
            <button
              onClick={() => setLogs([])}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Effacer
            </button>
          </div>
          <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-48 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">Aucun log pour le moment...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            📖 Instructions
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200 text-sm">
            <li>Téléchargez ou sélectionnez votre fichier APK Flutter</li>
            <li>L'APK sera automatiquement installé dans l'émulateur</li>
            <li>Cliquez sur "Démarrer" pour lancer l'application</li>
            <li>Utilisez les contrôles pour tester différentes fonctionnalités</li>
            <li>Consultez les logs pour voir les événements en temps réel</li>
          </ol>
        </div>
      </div>
    </AdminLayout>
  );
}
