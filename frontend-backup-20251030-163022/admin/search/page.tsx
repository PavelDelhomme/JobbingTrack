'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Download, TrendingUp, Clock, AlertCircle, Zap } from 'lucide-react';
import { AdminLayout } from '@/components/features';
import { searchService } from '@/lib/api';
import { OptimizedSearch } from '@/components/features';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Badge } from '@/components/ui';
import { GlobalSearch } from '@/components/features';

interface SearchResult {
  module: string;
  results: any[];
  total: number;
  error?: string;
  success?: boolean;
}

interface AdvancedSearchFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  priority?: string;
}

export default function SearchPage() {
  const [results, setResults] = useState<any[]>([]);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Charger l'historique de recherche
  useEffect(() => {
    const stored = localStorage.getItem('searchHistory');
    if (stored) {
      setSearchHistory(JSON.parse(stored));
    }
  }, []);

  // Gestionnaire de sélection de résultat
  const handleResultSelect = (result: any, module: string) => {
    console.log('Résultat sélectionné:', result, module);
    // Ici on pourrait ouvrir une page détaillée ou effectuer une action
  };

  const getModuleIcon = (module: string) => {
    const icons: Record<string, string> = {
      applications: '📋',
      companies: '🏢',
      contacts: '👥',
      interviews: '📅',
      calls: '📞',
      combined: '🔍'
    };
    return icons[module] || '📄';
  };

  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      applications: 'Candidatures',
      companies: 'Entreprises',
      contacts: 'Contacts',
      interviews: 'Entretiens',
      calls: 'Appels',
      combined: 'Tous modules'
    };
    return labels[module] || module;
  };

  const formatResult = (result: any, module: string) => {
    switch (module) {
      case 'applications':
        return {
          title: result.title || 'Candidature sans titre',
          subtitle: result.companyName || 'Entreprise inconnue',
          details: `${result.status} • ${result.createdAt ? new Date(result.createdAt).toLocaleDateString() : ''}`,
          link: `/backoffice/applications/${result.id}`
        };
      case 'companies':
        return {
          title: result.name,
          subtitle: `${result.sector} • ${result.location || ''}`,
          details: result.website || '',
          link: `/backoffice/companies/${result.id}`
        };
      case 'contacts':
        return {
          title: `${result.firstName} ${result.lastName}`,
          subtitle: result.position || '',
          details: `${result.email} • ${result.companyName || ''}`,
          link: `/backoffice/contacts/${result.id}`
        };
      case 'interviews':
        return {
          title: result.type || 'Entretien',
          subtitle: result.companyName || '',
          details: `${result.status} • ${result.scheduledAt ? new Date(result.scheduledAt).toLocaleDateString() : ''}`,
          link: `/backoffice/interviews/${result.id}`
        };
      case 'calls':
        return {
          title: result.title || 'Appel',
          subtitle: result.companyName || '',
          details: `${result.status} • ${result.scheduledAt ? new Date(result.scheduledAt).toLocaleDateString() : ''}`,
          link: `/backoffice/calls/${result.id}`
        };
      default:
        return {
          title: result.title || result.name || 'Élément',
          subtitle: '',
          details: '',
          link: '#'
        };
    }
  };

  const exportResults = () => {
    const allResults = results.flatMap(result => result.results || []);
    const csvContent = [
      ['Module', 'Titre', 'Sous-titre', 'Détails', 'Lien'].join(','),
      ...allResults.map(result => [
        getModuleLabel(results.find(r => r.results?.includes(result))?.module || 'unknown'),
        formatResult(result, results.find(r => r.results?.includes(result))?.module || 'unknown').title,
        formatResult(result, results.find(r => r.results?.includes(result))?.module || 'unknown').subtitle,
        formatResult(result, results.find(r => r.results?.includes(result))?.module || 'unknown').details,
        formatResult(result, results.find(r => r.results?.includes(result))?.module || 'unknown').link
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalResults = results.reduce((sum, result) => sum + (result.total || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-8 w-8 text-blue-600" />
              Recherche Optimisée
            </h1>
            <p className="text-gray-600">Recherche intelligente avec indexation côté client</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isAdvancedMode ? "default" : "outline"}
              onClick={() => setIsAdvancedMode(!isAdvancedMode)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Mode {isAdvancedMode ? 'Simple' : 'Avancé'}
            </Button>
          </div>
        </div>

        {/* Composant de recherche optimisée - Mode simplifié pour éviter les fuites mémoire */}
        <OptimizedSearch
          onResultSelect={handleResultSelect}
          enableOfflineSearch={false}
        />

        {/* Informations sur l'optimisation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Fonctionnalités d'Optimisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">🔍 Index côté client</h4>
                <p className="text-blue-700 dark:text-blue-300">
                  Recherche instantanée dans les données mises en cache, même hors ligne
                </p>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">⚡ Mode hybride</h4>
                <p className="text-green-700 dark:text-green-300">
                  Combine recherche en ligne et index local pour des résultats optimaux
                </p>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-1">💾 Cache intelligent</h4>
                <p className="text-purple-700 dark:text-purple-300">
                  Mise en cache automatique avec gestion du cycle de vie
                </p>
              </div>

              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-1">📊 Scoring avancé</h4>
                <p className="text-orange-700 dark:text-orange-300">
                  Algorithme de pertinence avec pondération par champ
                </p>
              </div>

              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">🔄 Synchronisation</h4>
                <p className="text-red-700 dark:text-red-300">
                  Synchronisation automatique des opérations en mode hors ligne
                </p>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <h4 className="font-medium text-indigo-900 dark:text-indigo-100 mb-1">📱 PWA Ready</h4>
                <p className="text-indigo-700 dark:text-indigo-300">
                  Fonctionne parfaitement en mode application installée
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
