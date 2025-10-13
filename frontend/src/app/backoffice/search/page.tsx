'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Download, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { searchService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GlobalSearch } from '@/components/GlobalSearch';

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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'applications', 'companies', 'contacts', 'interviews', 'calls'
  ]);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'name'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<AdvancedSearchFilters>({});
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Charger l'historique de recherche
  useEffect(() => {
    const stored = localStorage.getItem('searchHistory');
    if (stored) {
      setSearchHistory(JSON.parse(stored));
    }
  }, []);

  const performAdvancedSearch = async () => {
    if (!query.trim() || query.length < 2) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await searchService.advancedSearch({
        query,
        modules: selectedModules,
        filters,
        sortBy,
        sortOrder,
        limit: 50,
        offset: 0
      });

      if (response.data.success) {
        setResults([{
          module: 'combined',
          results: response.data.results,
          total: response.data.pagination.total,
          success: true
        }]);

        // Sauvegarder dans l'historique
        const newHistory = [query, ...searchHistory.filter(s => s !== query)].slice(0, 10);
        setSearchHistory(newHistory);
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      }
    } catch (error) {
      console.error('Erreur lors de la recherche avancée:', error);
    } finally {
      setIsLoading(false);
    }
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
    a.download = `search-results-${query}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalResults = results.reduce((sum, result) => sum + (result.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recherche Globale</h1>
          <p className="text-gray-600">Recherchez dans tous les modules de l'application</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isAdvancedMode ? "default" : "outline"}
            onClick={() => setIsAdvancedMode(!isAdvancedMode)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Mode {isAdvancedMode ? 'Simple' : 'Avancé'}
          </Button>
          {totalResults > 0 && (
            <Button variant="outline" onClick={exportResults}>
              <Download className="h-4 w-4 mr-2" />
              Exporter ({totalResults})
            </Button>
          )}
        </div>
      </div>

      {/* Barre de recherche principale */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Rechercher dans tous les modules..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="text-lg"
                />
              </div>
              <Button
                onClick={isAdvancedMode ? performAdvancedSearch : () => {/* recherche simple */}}
                disabled={!query.trim() || query.length < 2 || isLoading}
                size="lg"
              >
                <Search className="h-4 w-4 mr-2" />
                {isLoading ? 'Recherche...' : 'Rechercher'}
              </Button>
            </div>

            {/* Sélection des modules */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 mr-2">Modules:</span>
              {['applications', 'companies', 'contacts', 'interviews', 'calls'].map((module) => (
                <Badge
                  key={module}
                  variant={selectedModules.includes(module) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedModules(prev =>
                    prev.includes(module)
                      ? prev.filter(m => m !== module)
                      : [...prev, module]
                  )}
                >
                  {getModuleIcon(module)} {getModuleLabel(module)}
                </Badge>
              ))}
            </div>

            {/* Mode avancé */}
            {isAdvancedMode && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-1">Trier par</label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Pertinence</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="name">Nom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ordre</label>
                  <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Décroissant</SelectItem>
                      <SelectItem value="asc">Croissant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Statut</label>
                  <Select value={filters.status || ''} onValueChange={(value) =>
                    setFilters(prev => ({ ...prev, status: value || undefined }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les statuts</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Historique de recherche */}
      {searchHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Recherches récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((search, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(search)}
                >
                  {search}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Résultats de recherche */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Recherche en cours...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Résultats de recherche
              </div>
              <Badge variant="secondary">
                {totalResults} résultat{totalResults > 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.map((result) => (
              <div key={result.module} className="mb-6 last:mb-0">
                {/* En-tête du module */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{getModuleIcon(result.module)}</span>
                  <h3 className="font-semibold">
                    {getModuleLabel(result.module)}
                  </h3>
                  <Badge variant="outline">
                    {result.total} résultat{result.total > 1 ? 's' : ''}
                  </Badge>
                  {result.error && (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Erreur</span>
                    </div>
                  )}
                </div>

                {/* Liste des résultats */}
                {result.results && result.results.length > 0 ? (
                  <div className="grid gap-3">
                    {result.results.map((item, index) => {
                      const formatted = formatResult(item, result.module);
                      return (
                        <div
                          key={index}
                          className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => window.open(formatted.link, '_blank')}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">
                                {formatted.title}
                              </h4>
                              {formatted.subtitle && (
                                <p className="text-sm text-gray-600 mb-1">
                                  {formatted.subtitle}
                                </p>
                              )}
                              {formatted.details && (
                                <p className="text-xs text-gray-500">
                                  {formatted.details}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {getModuleLabel(result.module)}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun résultat trouvé dans ce module</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Aucun résultat */}
      {!isLoading && query.length >= 2 && totalResults === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun résultat trouvé
              </h3>
              <p className="text-gray-600 mb-4">
                Aucun élément ne correspond à votre recherche "{query}"
              </p>
              <div className="text-sm text-gray-500">
                <p className="mb-2">Suggestions :</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Vérifiez l'orthographe de votre requête</li>
                  <li>Essayez avec des termes plus généraux</li>
                  <li>Incluez plus de modules dans votre recherche</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
