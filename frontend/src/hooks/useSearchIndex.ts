import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOfflineSync } from './useOfflineSync';
import { useSearchPreloader } from './useSearchPreloader';

interface SearchIndexEntry {
  id: string;
  type: string;
  title: string;
  content: string;
  searchableText: string;
  metadata: Record<string, any>;
  lastModified: number;
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  highlights: string[];
}

interface SearchIndexState {
  index: Map<string, SearchIndexEntry>;
  isIndexing: boolean;
  lastIndexUpdate: number;
  indexStats: {
    totalEntries: number;
    byType: Record<string, number>;
    totalSize: number;
  };
}

export function useSearchIndex() {
  const { getCache } = useOfflineSync();
  const { preloadAll, isCacheFresh, smartPreload, isPreloading: isPreloadingData } = useSearchPreloader({
    enabled: true,
    priorityEntities: ['applications', 'companies', 'contacts', 'interviews', 'calls'],
    preloadOnAppStart: true,
    preloadOnNetworkChange: true,
    maxCacheAge: 30,
    batchSize: 100
  });

  const [state, setState] = useState<SearchIndexState>({
    index: new Map(),
    isIndexing: false,
    lastIndexUpdate: 0,
    indexStats: {
      totalEntries: 0,
      byType: {},
      totalSize: 0
    }
  });

  // Configuration d'indexation par type d'entité
  const indexConfigs = {
    applications: {
      fields: ['title', 'description', 'companyName', 'status', 'notes'],
      weight: 1.0,
      boost: ['title', 'companyName']
    },
    companies: {
      fields: ['name', 'sector', 'description', 'website', 'location'],
      weight: 0.9,
      boost: ['name', 'sector']
    },
    contacts: {
      fields: ['firstName', 'lastName', 'email', 'phone', 'position', 'companyName'],
      weight: 0.8,
      boost: ['firstName', 'lastName', 'email']
    },
    interviews: {
      fields: ['type', 'status', 'notes', 'feedback', 'companyName'],
      weight: 0.7,
      boost: ['type', 'companyName']
    },
    calls: {
      fields: ['title', 'notes', 'status', 'outcome'],
      weight: 0.6,
      boost: ['title']
    }
  };

  // Fonction de normalisation du texte pour la recherche
  const normalizeText = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^\w\s]/g, ' ') // Remplacer la ponctuation par des espaces
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim();
  }, []);

  // Fonction de calcul du score de pertinence
  const calculateScore = useCallback((
    entry: SearchIndexEntry,
    queryTerms: string[],
    config: any
  ): number => {
    let score = 0;
    const searchableText = normalizeText(entry.searchableText);

    queryTerms.forEach(term => {
      let termScore = 0;
      const termRegex = new RegExp(term, 'gi');

      // Recherche dans le texte global
      const matches = searchableText.match(termRegex);
      if (matches) {
        termScore += matches.length * config.weight;
      }

      // Boost pour les champs prioritaires
      config.boost.forEach((field: string) => {
        const fieldValue = normalizeText(entry.metadata[field] || '');
        const fieldMatches = fieldValue.match(termRegex);
        if (fieldMatches) {
          termScore += fieldMatches.length * config.weight * 1.5;
        }
      });

      score += termScore;
    });

    return score;
  }, [normalizeText]);

  // Fonction de création d'extraits avec surlignage
  const createHighlights = useCallback((
    text: string,
    queryTerms: string[]
  ): string[] => {
    const highlights: string[] = [];
    const normalizedText = text.toLowerCase();

    queryTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      const matches = [...normalizedText.matchAll(regex)];

      matches.forEach(match => {
        const start = Math.max(0, match.index! - 20);
        const end = Math.min(text.length, match.index! + match[1].length + 20);
        const excerpt = text.substring(start, end);

        if (excerpt.length > 5) {
          highlights.push(excerpt);
        }
      });
    });

    return [...new Set(highlights)].slice(0, 3); // Maximum 3 extraits
  }, []);

  // Indexer les données d'une entité
  const indexEntityData = useCallback((
    entityType: string,
    data: any[]
  ) => {
    const config = indexConfigs[entityType as keyof typeof indexConfigs];
    if (!config) return;

    const newEntries: SearchIndexEntry[] = [];

    data.forEach(item => {
      // Construire le texte searchable
      const searchableParts: string[] = [];

      config.fields.forEach(field => {
        const value = item[field];
        if (value && typeof value === 'string') {
          searchableParts.push(value);
        } else if (value && typeof value === 'object') {
          // Pour les objets comme les dates, convertir en string
          searchableParts.push(JSON.stringify(value));
        }
      });

      const searchableText = searchableParts.join(' ');

      if (searchableText.trim()) {
        newEntries.push({
          id: `${entityType}_${item.id}`,
          type: entityType,
          title: item.title || item.name || `${entityType} #${item.id}`,
          content: searchableParts.slice(0, 2).join(' '), // Premier champ comme contenu
          searchableText: normalizeText(searchableText),
          metadata: item,
          lastModified: Date.now()
        });
      }
    });

    return newEntries;
  }, [indexConfigs, normalizeText]);

  // Construire l'index de recherche
  const buildSearchIndex = useCallback(async (forcePreload = false) => {
    setState(prev => ({ ...prev, isIndexing: true }));

    try {
      const newIndex = new Map<string, SearchIndexEntry>();
      const entitiesToPreload: string[] = [];

      // Vérifier quels entités ont besoin d'être préchargées
      for (const [entityType, config] of Object.entries(indexConfigs)) {
        const cacheKey = `${entityType}_list`;
        const cachedData = getCache(cacheKey);

        if (!cachedData || !isCacheFresh(entityType) || forcePreload) {
          entitiesToPreload.push(entityType);
        }
      }

      // Précharger les entités nécessaires
      if (entitiesToPreload.length > 0) {
        console.log(`📦 Préchargement de ${entitiesToPreload.length} entités pour l'index`);
        await Promise.all(entitiesToPreload.map(entityType => preloadEntity(entityType)));
      }

      // Indexer chaque type d'entité depuis le cache
      for (const [entityType, config] of Object.entries(indexConfigs)) {
        const cachedData = getCache(`${entityType}_list`);

        if (cachedData && Array.isArray(cachedData)) {
          const entries = indexEntityData(entityType, cachedData);
          entries.forEach(entry => {
            newIndex.set(entry.id, entry);
          });
        }
      }

      // Calculer les statistiques
      const byType: Record<string, number> = {};
      newIndex.forEach(entry => {
        byType[entry.type] = (byType[entry.type] || 0) + 1;
      });

      const totalSize = JSON.stringify([...newIndex.values()]).length;

      setState(prev => ({
        ...prev,
        index: newIndex,
        isIndexing: false,
        lastIndexUpdate: Date.now(),
        indexStats: {
          totalEntries: newIndex.size,
          byType,
          totalSize
        }
      }));

      console.log(`🔍 Index de recherche construit: ${newIndex.size} entrées`);
    } catch (error) {
      console.error('Erreur lors de la construction de l\'index:', error);
      setState(prev => ({ ...prev, isIndexing: false }));
    }
  }, [getCache, indexEntityData, isCacheFresh, preloadEntity]);

  // Recherche dans l'index
  const search = useCallback((
    query: string,
    options: {
      types?: string[];
      limit?: number;
      threshold?: number;
    } = {}
  ): SearchResult[] => {
    if (!query.trim() || query.length < 2) return [];

    const { types = [], limit = 50, threshold = 0.1 } = options;
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);

    const results: SearchResult[] = [];

    state.index.forEach(entry => {
      // Filtrer par type si spécifié
      if (types.length > 0 && !types.includes(entry.type)) {
        return;
      }

      // Calculer le score de pertinence
      const config = indexConfigs[entry.type as keyof typeof indexConfigs];
      const score = calculateScore(entry, queryTerms, config);

      if (score >= threshold) {
        const highlights = createHighlights(
          entry.content,
          queryTerms
        );

        results.push({
          id: entry.id,
          type: entry.type,
          title: entry.title,
          content: entry.content,
          score,
          metadata: entry.metadata,
          highlights
        });
      }
    });

    // Trier par score décroissant
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }, [state.index, calculateScore, createHighlights]);

  // Recherche rapide (pour autocomplete/suggestions)
  const quickSearch = useCallback((
    query: string,
    limit = 10
  ): SearchResult[] => {
    if (!query.trim()) return [];

    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    const results: SearchResult[] = [];

    // Recherche uniquement dans les titres pour la rapidité
    state.index.forEach(entry => {
      const titleNormalized = normalizeText(entry.title);
      const hasMatch = queryTerms.some(term =>
        titleNormalized.includes(term)
      );

      if (hasMatch) {
        results.push({
          id: entry.id,
          type: entry.type,
          title: entry.title,
          content: entry.content,
          score: 1.0, // Score fixe pour la rapidité
          metadata: entry.metadata,
          highlights: []
        });
      }
    });

    return results.slice(0, limit);
  }, [state.index, normalizeText]);

  // Mettre à jour l'index quand le cache change
  useEffect(() => {
    const interval = setInterval(() => {
      buildSearchIndex();
    }, 5 * 60 * 1000); // Mettre à jour toutes les 5 minutes

    // Construire l'index initial
    buildSearchIndex();

    return () => clearInterval(interval);
  }, [buildSearchIndex]);

  // Statistiques de l'index
  const getIndexStats = useMemo(() => {
    return {
      totalEntries: state.indexStats.totalEntries,
      byType: state.indexStats.byType,
      totalSize: state.indexStats.totalSize,
      lastUpdate: new Date(state.lastIndexUpdate),
      isIndexing: state.isIndexing,
      isPreloading: isPreloadingData,
      coverage: Object.keys(indexConfigs).reduce((acc, type) => {
        acc[type] = state.indexStats.byType[type] || 0;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [state.indexStats, state.isIndexing, state.lastIndexUpdate, isPreloadingData]);

  return {
    // État
    isIndexing: state.isIndexing,
    lastIndexUpdate: state.lastIndexUpdate,
    stats: getIndexStats,

    // Actions
    search,
    quickSearch,
    buildSearchIndex,

    // Utilitaires
    getIndexEntry: (id: string) => state.index.get(id),
    getEntriesByType: (type: string) => Array.from(state.index.values()).filter(entry => entry.type === type)
  };
}
