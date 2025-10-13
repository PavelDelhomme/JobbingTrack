'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, Clock, TrendingUp } from 'lucide-react';
import { searchService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SearchResult {
  module: string;
  results: any[];
  total: number;
  error?: string;
  success?: boolean;
}

interface GlobalSearchProps {
  onResultSelect?: (result: any, module: string) => void;
  className?: string;
}

export function GlobalSearch({ onResultSelect, className = '' }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'applications', 'companies', 'contacts', 'interviews', 'calls'
  ]);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Charger les recherches récentes depuis le localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Fermer la recherche en cliquant en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await searchService.globalSearch(
        searchQuery,
        selectedModules.length > 0 ? selectedModules : undefined,
        20
      );

      if (response.data.success) {
        setResults(response.data.results);
        setIsOpen(true);

        // Sauvegarder la recherche récente
        const newRecentSearches = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
        setRecentSearches(newRecentSearches);
        localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    performSearch(searchQuery);
  };

  const handleResultClick = (result: any, module: string) => {
    if (onResultSelect) {
      onResultSelect(result, module);
    }
    setIsOpen(false);
  };

  const toggleModule = (module: string) => {
    setSelectedModules(prev =>
      prev.includes(module)
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

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

  const totalResults = results.reduce((sum, result) => sum + (result.total || 0), 0);

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      {/* Barre de recherche principale */}
      <div className="relative flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Rechercher dans tous les modules..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="pl-10 pr-20"
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="ml-2"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Filtres de modules */}
      {showFilters && (
        <Card className="absolute top-full mt-2 w-full z-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Modules à rechercher</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {['applications', 'companies', 'contacts', 'interviews', 'calls'].map((module) => (
                <Button
                  key={module}
                  variant={selectedModules.includes(module) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleModule(module)}
                  className="text-xs"
                >
                  {getModuleIcon(module)} {getModuleLabel(module)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Résultats de recherche */}
      {isOpen && (query.length >= 2 || recentSearches.length > 0) && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-hidden z-50">
          <CardContent className="p-0">
            {/* Recherches récentes */}
            {query.length < 2 && recentSearches.length > 0 && (
              <div className="p-3 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Recherches récentes</span>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSearch(search)}
                      className="w-full justify-start text-sm h-8"
                    >
                      {search}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Résultats de recherche */}
            {isLoading && (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Recherche en cours...</p>
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <>
                {/* Résumé des résultats */}
                <div className="p-3 bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">
                        {totalResults} résultat{totalResults > 1 ? 's' : ''} trouvé{totalResults > 1 ? 's' : ''}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Liste des résultats par module */}
                <div className="max-h-80 overflow-y-auto">
                  {results.map((result) => (
                    <div key={result.module} className="border-b last:border-b-0">
                      {/* En-tête du module */}
                      <div className="p-3 bg-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getModuleIcon(result.module)}</span>
                            <span className="font-medium">{getModuleLabel(result.module)}</span>
                            <span className="text-sm text-gray-600">
                              ({result.total} résultat{result.total > 1 ? 's' : ''})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Résultats du module */}
                      {result.results && result.results.length > 0 && (
                        <div className="divide-y">
                          {result.results.slice(0, 3).map((item, index) => (
                            <div
                              key={index}
                              className="p-3 hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleResultClick(item, result.module)}
                            >
                              <div className="font-medium text-sm truncate">
                                {item.title || item.name || item.firstName + ' ' + item.lastName || 'Sans titre'}
                              </div>
                              {item.companyName && (
                                <div className="text-xs text-gray-600 truncate">
                                  {item.companyName}
                                </div>
                              )}
                              {item.description && (
                                <div className="text-xs text-gray-500 truncate mt-1">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          ))}
                          {result.total > 3 && (
                            <div className="p-2 text-center">
                              <Button variant="ghost" size="sm" className="text-xs">
                                Voir tous les résultats ({result.total})
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Erreur du module */}
                      {result.error && (
                        <div className="p-3 text-center text-sm text-red-600">
                          Erreur: {result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Aucun résultat */}
            {!isLoading && query.length >= 2 && results.length > 0 && totalResults === 0 && (
              <div className="p-4 text-center">
                <div className="text-gray-500 mb-2">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun résultat trouvé pour "{query}"</p>
                </div>
                <p className="text-xs text-gray-400">
                  Essayez avec des termes différents ou vérifiez l'orthographe
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
