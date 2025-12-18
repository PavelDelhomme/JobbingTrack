'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { Search, Filter, X, Clock, TrendingUp, Zap, Database, Settings, Users, Bell, Archive, Trash2, Calendar, FileText } from '@/lib/icons';
import { useSearchIndex } from '@/hooks/useSearchIndex';
import { searchService } from '@/lib/api';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui';

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
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'applications', 'companies', 'contacts', 'interviews', 'calls',
    'users', 'events', 'notifications', 'archives', 'trash'
  ]);
  const [searchMode, setSearchMode] = useState<'online' | 'offline' | 'hybrid'>('online');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    dateRange: '',
    status: '',
    priority: ''
  });

  const {
    search,
    isIndexing,
    stats,
    buildSearchIndex
  } = useSearchIndex();

  // Charger les recherches récentes
  useEffect(() => {
    const stored = localStorage.getItem('recentOptimizedSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Recherche simple et directe (pas de debounce complexe)
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    try {
      // Recherche en ligne directe (mode par défaut)
      const response = await searchService.globalSearch(
        searchQuery,
        selectedModules.length > 0 ? selectedModules : undefined,
        20
      );

      if (response.data.success) {
        const searchResults = response.data.results.flatMap((r: any) => r.results || []);
        setResults(searchResults.slice(0, 20)); // Limiter à 20 résultats
      } else {
        setResults([]);
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
  }, [searchService, selectedModules, recentSearches]);

  // Gestionnaire de changement de requête
  const handleSearchChange = (searchQuery: string) => {
    setQuery(searchQuery);
    performSearch(searchQuery);
  };

  // Gestionnaire de sélection de résultat
  const handleResultClick = (result: any) => {
    if (onResultSelect) {
      onResultSelect(result, result.type);
    }
  };

  // Recherche avancée manuelle
  const handleAdvancedSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);

    try {
      // Recherche avec tous les modules disponibles pour une recherche complète
      const allModules = ['applications', 'companies', 'contacts', 'interviews', 'calls',
                         'users', 'events', 'notifications', 'archives', 'trash'];
      const response = await searchService.globalSearch(
        query,
        selectedModules.length > 0 ? selectedModules : allModules,
        100 // Plus de résultats pour la recherche avancée
      );

      if (response.data.success) {
        const searchResults = response.data.results.flatMap((r: any) => r.results || []);
        setResults(searchResults.slice(0, 100));
      }
    } catch (error) {
      console.error('Erreur lors de la recherche avancée:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Obtenir l'icône du module
  const getModuleIcon = (module: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      applications: <FileText className="h-3 w-3" />,
      companies: <Database className="h-3 w-3" />,
      contacts: <Users className="h-3 w-3" />,
      interviews: <Calendar className="h-3 w-3" />,
      calls: <Bell className="h-3 w-3" />,
      users: <Users className="h-3 w-3" />,
      events: <Calendar className="h-3 w-3" />,
      notifications: <Bell className="h-3 w-3" />,
      archives: <Archive className="h-3 w-3" />,
      trash: <Trash2 className="h-3 w-3" />
    };
    return iconMap[module] || <Search className="h-3 w-3" />;
  };

  // Obtenir le label du module
  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      applications: 'Candidatures',
      companies: 'Entreprises',
      contacts: 'Contacts',
      interviews: 'Entretiens',
      calls: 'Appels',
      users: 'Utilisateurs',
      events: 'Événements',
      notifications: 'Notifications',
      archives: 'Archives',
      trash: 'Corbeille'
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Rechercher dans tous les modules..."
                  value={query}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-10"
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Mode de recherche simple */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => buildSearchIndex()}
                  disabled={isIndexing}
                  className="text-xs"
                >
                  {isIndexing ? '🔄' : '⚡'} Index
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAdvancedSearch}
                  disabled={isLoading || !query.trim()}
                  className={`text-xs ${Object.values(searchFilters).some(filter => filter !== '') ? 'border-primary bg-primary/10' : ''}`}
                >
                  🔍 Avancé
                  {Object.values(searchFilters).some(filter => filter !== '') && (
                    <span className="ml-1 text-primary">●</span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Sélecteurs de modules */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">Modules:</span>
              {['applications', 'companies', 'contacts', 'interviews', 'calls', 'users', 'events', 'notifications', 'archives', 'trash'].map((module) => (
                <Badge
                  key={module}
                  variant={selectedModules.includes(module) ? "default" : "outline"}
                  className="cursor-pointer text-xs hover:bg-accent transition-colors"
                  onClick={() => setSelectedModules(prev =>
                    prev.includes(module)
                      ? prev.filter(m => m !== module)
                      : [...prev, module]
                  )}
                >
                  <span className="flex items-center gap-1">
                    {getModuleIcon(module)}
                    {getModuleLabel(module)}
                  </span>
                </Badge>
              ))}
            </div>

            {/* Options avancées simples */}
            {showAdvanced && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Database className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    <span className="text-muted-foreground">Index: {stats.totalEntries} entrées</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    <span className="text-muted-foreground">Résultats: {results.length}</span>
                  </div>
                </div>

                {/* Filtres avancés */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-border">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Période</label>
                    <select
                      value={searchFilters.dateRange}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                      className="w-full px-2 py-1 text-xs bg-background border border-input rounded-md text-foreground"
                    >
                      <option value="">Toutes les dates</option>
                      <option value="today">Aujourd'hui</option>
                      <option value="week">Cette semaine</option>
                      <option value="month">Ce mois</option>
                      <option value="year">Cette année</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Statut</label>
                    <select
                      value={searchFilters.status}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-2 py-1 text-xs bg-background border border-input rounded-md text-foreground"
                    >
                      <option value="">Tous les statuts</option>
                      <option value="active">Actif</option>
                      <option value="pending">En attente</option>
                      <option value="completed">Terminé</option>
                      <option value="archived">Archivé</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Priorité</label>
                    <select
                      value={searchFilters.priority}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-2 py-1 text-xs bg-background border border-input rounded-md text-foreground"
                    >
                      <option value="">Toutes les priorités</option>
                      <option value="high">Élevée</option>
                      <option value="medium">Moyenne</option>
                      <option value="low">Faible</option>
                    </select>
                  </div>
                </div>

                {/* Indicateur de filtres actifs */}
                {Object.values(searchFilters).some(filter => filter !== '') && (
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant="secondary" className="text-xs">
                      Filtres actifs
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchFilters({ dateRange: '', status: '', priority: '' })}
                      className="text-xs h-6 px-2"
                    >
                      Effacer les filtres
                    </Button>
                  </div>
                )}
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
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Recherches récentes</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {recentSearches.map((search, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearchChange(search)}
                      className="text-xs h-7 hover:bg-accent transition-colors"
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
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Recherche en cours...</p>
              </div>
            )}

            {/* Aucun résultat */}
            {!isLoading && query.length >= 2 && results.length === 0 && (
              <div className="p-6 text-center">
                <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-foreground mb-1">Aucun résultat trouvé</p>
                <p className="text-xs text-muted-foreground">
                  Essayez avec des termes différents ou sélectionnez plus de modules
                </p>
              </div>
            )}

            {/* Résultats */}
            {!isLoading && results.length > 0 && (
              <>
                {/* Statistiques des résultats */}
                <div className="p-3 bg-muted/30 border-b border-border">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-foreground">
                        {results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <Badge variant="default" className="text-xs">
                      🌐 En ligne
                    </Badge>
                  </div>

                  {/* Répartition par module */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(resultStats).map(([module, count]) => (
                      <Badge key={module} variant="outline" className="text-xs hover:bg-accent transition-colors">
                        <span className="flex items-center gap-1">
                          {getModuleIcon(module)}
                          {count}
                        </span>
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
                        className="p-3 hover:bg-accent/50 cursor-pointer border-b border-border last:border-b-0 transition-colors"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-muted-foreground">{getModuleIcon(formatted.module)}</span>
                              <h4 className="font-medium text-sm text-foreground truncate">
                                {formatted.title}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {getModuleLabel(formatted.module)}
                              </Badge>
                            </div>

                            {formatted.subtitle && (
                              <p className="text-xs text-muted-foreground truncate mb-1">
                                {formatted.subtitle}
                              </p>
                            )}

                            {formatted.details && (
                              <p className="text-xs text-muted-foreground truncate">
                                {formatted.details}
                              </p>
                            )}
                          </div>
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
          <strong>Recherche complète :</strong> Support du mode sombre, recherche dans 10 modules différents
          (candidatures, entreprises, contacts, entretiens, appels, utilisateurs, événements, notifications, archives, corbeille).
          Interface moderne avec recherche avancée manuelle et filtres avancés (date, statut, priorité).
        </AlertDescription>
      </Alert>
    </div>
  );
}
