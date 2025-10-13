'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, X, Clock, TrendingUp, Zap, Database } from 'lucide-react';
import { useSearchIndex } from '@/hooks/useSearchIndex';
import { searchService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OptimizedSearchProps {
  onResultSelect?: (result: any, module: string) => void;
  className?: string;
  enableOfflineSearch?: boolean;
}

export function OptimizedSearch({
  onResultSelect,
  className = '',
  enableOfflineSearch = true
}: OptimizedSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnlineSearch, setIsOnlineSearch] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'applications', 'companies', 'contacts', 'interviews', 'calls'
  ]);
  const [searchMode, setSearchMode] = useState<'online' | 'offline' | 'hybrid'>('hybrid');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    search,
    quickSearch,
    isIndexing,
    stats,
    buildSearchIndex,
    getIndexStats
  } = useSearchIndex();

  // Charger les recherches récentes
  useEffect(() => {
    const stored = localStorage.getItem('recentOptimizedSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Recherche en temps réel avec debounce
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;

    return (searchQuery: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    };
  }, []);

  // Effectuer la recherche
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    try {
      if (searchMode === 'online') {
        // Recherche uniquement en ligne
        const response = await searchService.globalSearch(
          searchQuery,
          selectedModules.length > 0 ? selectedModules : undefined,
          20
        );

        if (response.data.success) {
          setResults(response.data.results.flatMap((r: any) => r.results || []));
          setIsOnlineSearch(true);
        }
      } else if (searchMode === 'offline' && enableOfflineSearch) {
        // Recherche uniquement offline
        const offlineResults = search(searchQuery, {
          types: selectedModules,
          limit: 50
        });

        setResults(offlineResults);
        setIsOnlineSearch(false);
      } else {
        // Mode hybride : online + offline
        try {
          // Recherche en ligne
          const response = await searchService.globalSearch(
            searchQuery,
            selectedModules.length > 0 ? selectedModules : undefined,
            20
          );

          if (response.data.success) {
            const onlineResults = response.data.results.flatMap((r: any) => r.results || []);

            // Recherche offline pour complémenter
            if (enableOfflineSearch) {
              const offlineResults = search(searchQuery, {
                types: selectedModules,
                limit: 30
              });

              // Fusionner les résultats (éviter les doublons)
              const combinedResults = [...onlineResults];
              offlineResults.forEach(offlineResult => {
                const exists = combinedResults.find(r =>
                  r.id === offlineResult.id && r.type === offlineResult.type
                );
                if (!exists) {
                  combinedResults.push(offlineResult);
                }
              });

              setResults(combinedResults.slice(0, 50));
            } else {
              setResults(onlineResults);
            }

            setIsOnlineSearch(true);
          }
        } catch (error) {
          // Fallback vers la recherche offline si l'API échoue
          if (enableOfflineSearch) {
            const offlineResults = search(searchQuery, {
              types: selectedModules,
              limit: 50
            });
            setResults(offlineResults);
            setIsOnlineSearch(false);
          }
        }
      }

      // Sauvegarder la recherche récente
      const newRecentSearches = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
      setRecentSearches(newRecentSearches);
      localStorage.setItem('recentOptimizedSearches', JSON.stringify(newRecentSearches));

    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, searchService, selectedModules, searchMode, enableOfflineSearch, recentSearches]);

  // Gestionnaire de changement de requête
  const handleSearchChange = (searchQuery: string) => {
    setQuery(searchQuery);
    debouncedSearch(searchQuery);
  };

  // Gestionnaire de sélection de résultat
  const handleResultClick = (result: any) => {
    if (onResultSelect) {
      onResultSelect(result, result.type);
    }
  };

  // Obtenir l'icône du module
  const getModuleIcon = (module: string) => {
    const icons: Record<string, string> = {
      applications: '📋',
      companies: '🏢',
      contacts: '👥',
      interviews: '📅',
      calls: '📞'
    };
    return icons[module] || '🔍';
  };

  // Obtenir le label du module
  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      applications: 'Candidatures',
      companies: 'Entreprises',
      contacts: 'Contacts',
      interviews: 'Entretiens',
      calls: 'Appels'
    };
    return labels[module] || module;
  };

  // Formater le résultat pour l'affichage
  const formatResult = (result: any) => {
    return {
      title: result.title || result.name || 'Sans titre',
      subtitle: result.companyName || result.email || '',
      details: result.description || result.status || '',
      module: result.type
    };
  };

  // Statistiques des résultats
  const resultStats = useMemo(() => {
    const byModule: Record<string, number> = {};
    results.forEach(result => {
      byModule[result.type] = (byModule[result.type] || 0) + 1;
    });
    return byModule;
  }, [results]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Barre de recherche principale */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Contrôles de recherche */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Recherche intelligente..."
                  value={query}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-20"
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Mode de recherche */}
              <div className="flex gap-1">
                <Button
                  variant={searchMode === 'online' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSearchMode('online')}
                  className="text-xs"
                >
                  🌐 En ligne
                </Button>
                <Button
                  variant={searchMode === 'offline' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSearchMode('offline')}
                  disabled={!enableOfflineSearch}
                  className="text-xs"
                >
                  💾 Hors ligne
                </Button>
                <Button
                  variant={searchMode === 'hybrid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSearchMode('hybrid')}
                  className="text-xs"
                >
                  ⚡ Hybride
                </Button>
              </div>
            </div>

            {/* Sélecteurs de modules et options avancées */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Modules:</span>
              {['applications', 'companies', 'contacts', 'interviews', 'calls'].map((module) => (
                <Badge
                  key={module}
                  variant={selectedModules.includes(module) ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setSelectedModules(prev =>
                    prev.includes(module)
                      ? prev.filter(m => m !== module)
                      : [...prev, module]
                  )}
                >
                  {getModuleIcon(module)} {getModuleLabel(module)}
                </Badge>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs"
              >
                {showAdvanced ? 'Options ▲' : 'Options ▼'}
              </Button>
            </div>

            {/* Options avancées */}
            {showAdvanced && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Database className={`h-3 w-3 ${stats.isPreloading ? 'animate-pulse text-orange-600' : 'text-blue-600'}`} />
                    <span>Index: {stats.totalEntries} entrées</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-green-600" />
                    <span>Mode: {searchMode === 'online' ? 'API' : searchMode === 'offline' ? 'Index' : 'Mixte'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-purple-600" />
                    <span>Résultats: {results.length}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => buildSearchIndex(true)}
                    disabled={isIndexing || stats.isPreloading}
                    className="text-xs"
                  >
                    {isIndexing ? 'Indexation...' : stats.isPreloading ? 'Préchargement...' : 'Réindexer'}
                  </Button>
                </div>

                {/* Informations de préchargement */}
                {stats.isPreloading && (
                  <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                    📦 Préchargement des données en cours...
                  </div>
                )}

                {/* Couverture de l'index */}
                <div className="text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span>Couverture de l'index:</span>
                    <span className="font-medium">
                      {Math.round((stats.totalEntries / (Object.keys(stats.coverage).length * 50)) * 100)}%
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {Object.entries(stats.coverage).map(([type, count]) => (
                      <div key={type} className="flex-1 text-center">
                        <div className="text-xs text-gray-600">{type}</div>
                        <div className={`text-xs font-medium ${count > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Résultats de recherche */}
      {(query.length >= 2 || recentSearches.length > 0) && (
        <Card>
          <CardContent className="p-0">
            {/* Recherches récentes */}
            {query.length < 2 && recentSearches.length > 0 && (
              <div className="p-3 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Recherches récentes</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {recentSearches.map((search, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearchChange(search)}
                      className="text-xs h-7"
                    >
                      {search}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* État de chargement */}
            {isLoading && (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">
                  {searchMode === 'online' ? 'Recherche en ligne...' :
                   searchMode === 'offline' ? 'Recherche dans l\'index...' :
                   'Recherche hybride...'}
                </p>
              </div>
            )}

            {/* Aucun résultat */}
            {!isLoading && query.length >= 2 && results.length === 0 && (
              <div className="p-6 text-center">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-600 mb-1">Aucun résultat trouvé</p>
                <p className="text-xs text-gray-500">
                  Essayez avec des termes différents ou vérifiez les modules sélectionnés
                </p>
              </div>
            )}

            {/* Résultats */}
            {!isLoading && results.length > 0 && (
              <>
                {/* Statistiques des résultats */}
                <div className="p-3 bg-gray-50 border-b">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium">
                        {results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOnlineSearch && (
                        <Badge variant="default" className="text-xs">
                          🌐 En ligne
                        </Badge>
                      )}
                      {searchMode === 'hybrid' && (
                        <Badge variant="secondary" className="text-xs">
                          ⚡ Hybride
                        </Badge>
                      )}
                      {searchMode === 'offline' && (
                        <Badge variant="outline" className="text-xs">
                          💾 Index
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Répartition par module */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(resultStats).map(([module, count]) => (
                      <Badge key={module} variant="outline" className="text-xs">
                        {getModuleIcon(module)} {count}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Liste des résultats */}
                <div className="max-h-96 overflow-y-auto">
                  {results.map((result, index) => {
                    const formatted = formatResult(result);
                    return (
                      <div
                        key={`${result.type}_${result.id}_${index}`}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">{getModuleIcon(formatted.module)}</span>
                              <h4 className="font-medium text-sm truncate">
                                {formatted.title}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {getModuleLabel(formatted.module)}
                              </Badge>
                            </div>

                            {formatted.subtitle && (
                              <p className="text-xs text-gray-600 truncate mb-1">
                                {formatted.subtitle}
                              </p>
                            )}

                            {formatted.details && (
                              <p className="text-xs text-gray-500 truncate">
                                {formatted.details}
                              </p>
                            )}

                            {/* Surlignage des termes de recherche */}
                            {result.highlights && result.highlights.length > 0 && (
                              <div className="mt-1">
                                {result.highlights.map((highlight, i) => (
                                  <span
                                    key={i}
                                    className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded"
                                  >
                                    {highlight}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Score de pertinence (si recherche offline) */}
                          {!isOnlineSearch && result.score && (
                            <div className="ml-2 text-right">
                              <div className="text-xs text-gray-500">
                                Score: {(result.score * 100).toFixed(0)}%
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Informations sur l'optimisation */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Recherche optimisée :</strong> Index côté client pour des recherches instantanées,
          cache intelligent pour les performances, et mode hybride pour combiner les avantages
          de la recherche en ligne et hors ligne.
        </AlertDescription>
      </Alert>
    </div>
  );
}
