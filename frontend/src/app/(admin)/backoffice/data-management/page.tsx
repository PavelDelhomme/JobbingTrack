'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/features';
import { useAuth } from '@/lib/hooks/auth';
import { 
  Download, Upload, Database, Trash2, 
  AlertTriangle, CheckCircle, RefreshCw, FileDown, FileUp 
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function DataManagementPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleExport = async (type: string) => {
    try {
      setLoading(true);
      setMessage(null);
      
      const response = await axios.get(
        `${API_URL}/api/v1/admin/export/${type}`,
        { 
          responseType: 'blob',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export-${type}-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setMessage({ type: 'success', text: `Export ${type} réussi !` });
    } catch (error) {
      console.error('Erreur export:', error);
      setMessage({ type: 'error', text: `Erreur lors de l'export ${type}` });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un fichier' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      await axios.post(
        `${API_URL}/api/v1/admin/import`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setMessage({ type: 'success', text: 'Import réussi !' });
      setSelectedFile(null);
    } catch (error) {
      console.error('Erreur import:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'import' });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async (days: number) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer les données de plus de ${days} jours ?`)) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      
      await axios.post(
        `${API_URL}/api/v1/admin/cleanup`,
        { days },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: `Nettoyage effectué avec succès` });
    } catch (error) {
      console.error('Erreur nettoyage:', error);
      setMessage({ type: 'error', text: 'Erreur lors du nettoyage' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Gestion des Données
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Exportez, importez et gérez vos données
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
              <AlertTriangle className="h-5 w-5" />
            )}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <FileDown className="h-6 w-6 text-blue-600" />
              Exporter les données
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Exportez vos données au format JSON pour sauvegarde ou analyse
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleExport('applications')}
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exporter les candidatures
              </button>
              <button
                onClick={() => handleExport('companies')}
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exporter les entreprises
              </button>
              <button
                onClick={() => handleExport('contacts')}
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exporter les contacts
              </button>
              <button
                onClick={() => handleExport('all')}
                disabled={loading}
                className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                <Database className="h-4 w-4" />
                Exporter tout
              </button>
            </div>
          </div>

          {/* Import */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <FileUp className="h-6 w-6 text-green-600" />
              Importer des données
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Importez des données depuis un fichier JSON ou CSV
            </p>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Fichier sélectionné: {selectedFile.name}
                  </p>
                )}
              </div>
              <button 
                onClick={handleImport}
                disabled={loading || !selectedFile}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Importer
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Database className="h-6 w-6 text-purple-600" />
            Statistiques de la base de données
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Candidatures</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">-</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Entreprises</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">-</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Contacts</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">-</p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Utilisateurs</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">-</p>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Zone Dangereuse
          </h2>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            Ces actions sont irréversibles. Assurez-vous d'avoir une sauvegarde avant de continuer.
          </p>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => handleCleanup(90)}
              disabled={loading}
              className="py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Nettoyer données {'>'} 90 jours
            </button>
            <button 
              onClick={() => handleCleanup(365)}
              disabled={loading}
              className="py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Nettoyer données {'>'} 1 an
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

