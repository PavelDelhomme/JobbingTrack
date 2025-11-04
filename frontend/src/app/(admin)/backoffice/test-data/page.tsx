'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/features';
import { useAuth } from '@/lib/hooks/auth';
import { Database, Play, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function TestDataPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [generatedData, setGeneratedData] = useState<any>(null);

  const generateTestData = async (entityType: string, count: number) => {
    try {
      setLoading(true);
      setMessage(null);
      
      const response = await axios.post(
        `${API_URL}/api/v1/admin/generate-test-data`,
        { entityType, count },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setGeneratedData(response.data.data);
        setMessage({ 
          type: 'success', 
          text: `${count} ${entityType} générés avec succès !` 
        });
      }
    } catch (error) {
      console.error('Erreur génération:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la génération des données de test' });
    } finally {
      setLoading(false);
    }
  };

  const dataTypes = [
    { type: 'applications', label: 'Candidatures', color: 'blue' },
    { type: 'companies', label: 'Entreprises', color: 'green' },
    { type: 'contacts', label: 'Contacts', color: 'purple' },
    { type: 'users', label: 'Utilisateurs', color: 'orange' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Générateur de Données de Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Générez des données de test pour le développement et les tests
          </p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dataTypes.map(({ type, label, color }) => (
            <div
              key={type}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <Database className={`h-8 w-8 text-${color}-600`} />
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{label}</h2>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Générer des {label.toLowerCase()} de test avec des données réalistes
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => generateTestData(type, 10)}
                  disabled={loading}
                  className={`flex-1 py-2 px-4 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  <Play className="h-4 w-4" />
                  10 entrées
                </button>
                <button
                  onClick={() => generateTestData(type, 50)}
                  disabled={loading}
                  className={`flex-1 py-2 px-4 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  <Play className="h-4 w-4" />
                  50 entrées
                </button>
                <button
                  onClick={() => generateTestData(type, 100)}
                  disabled={loading}
                  className={`flex-1 py-2 px-4 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  <Play className="h-4 w-4" />
                  100 entrées
                </button>
              </div>
            </div>
          ))}
        </div>

        {generatedData && (
          <div className="bg-gray-900 text-gray-100 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold mb-4">Données Générées (aperçu)</h3>
            <pre className="overflow-auto text-sm max-h-96">
              {JSON.stringify(generatedData, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Attention</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Les données générées sont fictives et destinées uniquement aux environnements de développement et de test.
                Ne pas utiliser en production.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

