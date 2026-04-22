'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/features';
import { useAuth } from '@/lib/hooks/auth';
import { Database, Play, AlertCircle, CheckCircle, Trash2, RefreshCw, Settings, Zap, Users, Building2, FileText, Calendar, Phone, Mail, Clock, Tag } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

interface Preset {
  name: string;
  label: string;
  description: string;
  icon: any;
  config: {
    users: number;
    companies: number;
    applications: number;
    contacts: number;
    interviews: number;
    followups: number;
    calls: number;
    events: number;
    deletedItems: number;
    archivedItems: number;
  };
}

const PRESETS: Preset[] = [
  {
    name: 'minimal',
    label: 'Minimal',
    description: 'Données minimales pour tests rapides',
    icon: Zap,
    config: { users: 2, companies: 5, applications: 5, contacts: 5, interviews: 2, followups: 3, calls: 2, events: 5, deletedItems: 1, archivedItems: 1 }
  },
  {
    name: 'standard',
    label: 'Standard',
    description: 'Configuration standard pour développement',
    icon: Settings,
    config: { users: 3, companies: 10, applications: 20, contacts: 15, interviews: 8, followups: 12, calls: 10, events: 20, deletedItems: 5, archivedItems: 3 }
  },
  {
    name: 'complete',
    label: 'Complet',
    description: 'Suite complète avec toutes les relations',
    icon: Database,
    config: { users: 5, companies: 20, applications: 50, contacts: 40, interviews: 20, followups: 30, calls: 25, events: 50, deletedItems: 10, archivedItems: 8 }
  },
  {
    name: 'demo',
    label: 'Démo',
    description: 'Configuration optimisée pour démonstration',
    icon: Play,
    config: { users: 1, companies: 8, applications: 15, contacts: 12, interviews: 6, followups: 8, calls: 5, events: 15, deletedItems: 2, archivedItems: 2 }
  }
];

export default function TestDataPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('standard');
  const [customConfig, setCustomConfig] = useState(PRESETS.find(p => p.name === 'standard')!.config);
  const [showCustomConfig, setShowCustomConfig] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [balancedGenerate, setBalancedGenerate] = useState(false);

  const generateTestData = async (preset?: string, custom?: any) => {
    try {
      setLoading(true);
      setMessage(null);
      setOutput('');
      
      const config: Record<string, unknown> = {
        preset: preset || selectedPreset,
        custom: custom || (showCustomConfig ? customConfig : undefined),
        clean: false
      };
      if (balancedGenerate) config.balanced = true;
      
      const response = await axios.post(
        `${API_URL}/api/v1/admin/generate-test-data`,
        config,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setOutput(response.data.output || '');
        setMessage({ 
          type: 'success', 
          text: `Données de test générées avec succès !` 
        });
      }
    } catch (error: any) {
      console.error('Erreur génération:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Erreur lors de la génération des données de test' 
      });
    } finally {
      setLoading(false);
    }
  };

  const tagLikelyTestData = async () => {
    if (
      !confirm(
        'Marquer isTestData sur les comptes de test évidents et les entités liées (notes [TEST_DATA_TAG:…]) ? Admin et PROTECTED_USER_EMAILS exclus.'
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      const response = await axios.post(
        `${API_URL}/api/v1/admin/test-data/tag-likely`,
        { includeTaggedNotes: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setMessage({
          type: 'success',
          text: `Marquage terminé : ${JSON.stringify(response.data.tagged, null, 2)}`
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Erreur marquage données de test'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearTestData = async (onlyTestData: boolean = true) => {
    const message = onlyTestData
      ? '⚠️ Êtes-vous sûr de vouloir supprimer UNIQUEMENT les données de test (marquées isTestData=true) ?\n\nLes données de production ne seront PAS affectées.\n\nCette action est irréversible !'
      : '⚠️ DANGER ⚠️\n\nVoulez-vous supprimer TOUTES les données (test ET production) ?\n\n⚠️ CETTE ACTION EST IRRÉVERSIBLE ⚠️\n\nÊtes-vous ABSOLUMENT SÛR ?';
    
    if (!confirm(message)) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      
      const response = await axios.post(
        `${API_URL}/api/v1/admin/clear-test-data`,
        { onlyTestData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        const counts = response.data.deletedCounts || {};
        const total = Object.values(counts).reduce((sum: number, count: any) => sum + (count || 0), 0);
        
        setMessage({ 
          type: 'success', 
          text: `✅ ${total} données de test supprimées avec succès\n\nDétail: ${JSON.stringify(counts, null, 2)}` 
        });
        setOutput(response.data.message || '');
      }
    } catch (error: any) {
      console.error('Erreur nettoyage:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Erreur lors du nettoyage des données' 
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPresetData = PRESETS.find(p => p.name === selectedPreset);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Générateur de Données de Test
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Générez des données réalistes et cohérentes avec relations entrecroisées
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => tagLikelyTestData()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              title="Marquer isTestData sur comptes / entités de test existants"
            >
              <Tag className="h-5 w-5" />
              Marquer données existantes
            </button>
            <button
              onClick={() => clearTestData(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              title="Nettoyer uniquement les données de test (isTestData=true)"
            >
              <Trash2 className="h-5 w-5" />
              Nettoyer données de test
            </button>
            <button
              onClick={() => clearTestData(false)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              title="⚠️ DANGER: Supprimer TOUTES les données"
            >
              <Trash2 className="h-5 w-5" />
              Tout supprimer
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Presets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedPreset === preset.name;
            return (
              <div
                key={preset.name}
                onClick={() => {
                  setSelectedPreset(preset.name);
                  setCustomConfig(preset.config);
                  setShowCustomConfig(false);
                }}
                className={`bg-white dark:bg-gray-800 rounded-lg p-6 border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${
                    isSelected ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Icon className={`h-6 w-6 ${
                      isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                    }`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{preset.label}</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{preset.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{preset.config.users}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{preset.config.companies}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{preset.config.applications}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{preset.config.events}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Configuration personnalisée */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Configuration Personnalisée
            </h2>
            <button
              onClick={() => setShowCustomConfig(!showCustomConfig)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showCustomConfig ? 'Masquer' : 'Afficher'}
            </button>
          </div>

          {showCustomConfig && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(customConfig).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {key === 'users' && <><Users className="h-4 w-4 inline mr-1" /> Utilisateurs</>}
                    {key === 'companies' && <><Building2 className="h-4 w-4 inline mr-1" /> Entreprises</>}
                    {key === 'applications' && <><FileText className="h-4 w-4 inline mr-1" /> Candidatures</>}
                    {key === 'contacts' && <><Users className="h-4 w-4 inline mr-1" /> Contacts</>}
                    {key === 'interviews' && <><Calendar className="h-4 w-4 inline mr-1" /> Entretiens</>}
                    {key === 'followups' && <><Mail className="h-4 w-4 inline mr-1" /> Relances</>}
                    {key === 'calls' && <><Phone className="h-4 w-4 inline mr-1" /> Appels</>}
                    {key === 'events' && <><Clock className="h-4 w-4 inline mr-1" /> Événements</>}
                    {key === 'deletedItems' && 'Supprimés'}
                    {key === 'archivedItems' && 'Archivés'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={value as number}
                    onChange={(e) => setCustomConfig({ ...customConfig, [key]: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={balancedGenerate}
                onChange={(e) => setBalancedGenerate(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Volumes équilibrés (plus de contacts / relances / entretiens par rapport aux entreprises — recommandé pour les stats)
            </label>
            <button
              onClick={() => generateTestData(selectedPreset, showCustomConfig ? customConfig : undefined)}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Générer les données
                </>
              )}
            </button>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedPresetData && (
                <>
                  Preset: <strong>{selectedPresetData.label}</strong>
                  {showCustomConfig && ' (config personnalisée)'}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Résumé de ce qui sera généré */}
        {selectedPresetData && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              📊 Ce qui sera généré :
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-700 dark:text-blue-300">
              <div>👥 {showCustomConfig ? customConfig.users : selectedPresetData.config.users} utilisateurs</div>
              <div>🏢 {showCustomConfig ? customConfig.companies : selectedPresetData.config.companies} entreprises</div>
              <div>📝 {showCustomConfig ? customConfig.applications : selectedPresetData.config.applications} candidatures</div>
              <div>👤 {showCustomConfig ? customConfig.contacts : selectedPresetData.config.contacts} contacts</div>
              <div>🎤 {showCustomConfig ? customConfig.interviews : selectedPresetData.config.interviews} entretiens</div>
              <div>📧 {showCustomConfig ? customConfig.followups : selectedPresetData.config.followups} relances</div>
              <div>📞 {showCustomConfig ? customConfig.calls : selectedPresetData.config.calls} appels</div>
              <div>📅 {showCustomConfig ? customConfig.events : selectedPresetData.config.events} événements</div>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
              ✨ Les événements seront automatiquement créés et liés aux candidatures, entretiens, relances et appels
            </p>
          </div>
        )}

        {/* Output */}
        {output && (
          <div className="bg-gray-900 text-gray-100 rounded-lg p-6 border border-gray-700 overflow-auto max-h-96">
            <h3 className="text-lg font-bold mb-4">Sortie de génération</h3>
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {output}
            </pre>
          </div>
        )}

        {/* Avertissement */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Attention</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Les données générées sont fictives et destinées uniquement aux environnements de développement et de test.
                Ne pas utiliser en production. Toutes les données générées sont taguées pour faciliter le nettoyage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
