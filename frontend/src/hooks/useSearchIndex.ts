import { useState, useEffect, useCallback, useMemo } from "react";
import { searchService } from "@/lib/api";

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
  const [state, setState] = useState<SearchIndexState>({
    index: new Map(),
    isIndexing: false,
    lastIndexUpdate: 0,
    indexStats: {
      totalEntries: 0,
      byType: {},
      totalSize: 0,
    },
  });

  // Configuration simple d'indexation
  const entityTypes = [
    "applications",
    "companies",
    "contacts",
    "interviews",
    "calls",
  ];

  // Recherche en ligne directe (pas de préchargement automatique)
  const search = useCallback(
    async (
      query: string,
      options: {
        types?: string[];
        limit?: number;
      } = {},
    ): Promise<SearchResult[]> => {
      if (!query.trim() || query.length < 2) return [];

      const { types = [], limit = 20 } = options;

      try {
        const response = await searchService.globalSearch(
          query,
          types.length > 0 ? types : entityTypes,
          limit,
        );

        if (response.data.success) {
          // Convertir les résultats de l'API en format SearchResult
          return response.data.results.flatMap((moduleResult: any) =>
            (moduleResult.results || []).map((item: any) => ({
              id: `${moduleResult.type}_${item.id}`,
              type: moduleResult.type,
              title:
                item.title || item.name || `${moduleResult.type} #${item.id}`,
              content: item.description || item.notes || "",
              score: 1.0,
              metadata: item,
              highlights: [],
            })),
          );
        }

        return [];
      } catch (error) {
        console.error("Erreur lors de la recherche:", error);
        return [];
      }
    },
    [],
  );

  // Recherche rapide (retourne les résultats en ligne directement)
  const quickSearch = useCallback(
    async (query: string, limit = 10): Promise<SearchResult[]> => {
      return search(query, { limit });
    },
    [search],
  );

  // Construire l'index manuellement (pas automatique)
  const buildSearchIndex = useCallback(async () => {
    setState((prev) => ({ ...prev, isIndexing: true }));

    try {
      // Recherche simple pour construire un petit index local si nécessaire
      // Mais on évite le préchargement automatique pour éviter les boucles
      const results = await search("", { limit: 50 });

      const newIndex = new Map<string, SearchIndexEntry>();
      results.forEach((result) => {
        newIndex.set(result.id, {
          id: result.id,
          type: result.type,
          title: result.title,
          content: result.content,
          searchableText: `${result.title} ${result.content}`.toLowerCase(),
          metadata: result.metadata,
          lastModified: Date.now(),
        });
      });

      const byType: Record<string, number> = {};
      newIndex.forEach((entry) => {
        byType[entry.type] = (byType[entry.type] || 0) + 1;
      });

      setState((prev) => ({
        ...prev,
        index: newIndex,
        isIndexing: false,
        lastIndexUpdate: Date.now(),
        indexStats: {
          totalEntries: newIndex.size,
          byType,
          totalSize: JSON.stringify(Array.from(newIndex.values())).length,
        },
      }));
    } catch (error) {
      console.error("Erreur lors de la construction de l'index:", error);
      setState((prev) => ({ ...prev, isIndexing: false }));
    }
  }, [search]);

  // Statistiques simples
  const getIndexStats = useMemo(() => {
    return {
      totalEntries: state.indexStats.totalEntries,
      byType: state.indexStats.byType,
      totalSize: state.indexStats.totalSize,
      lastUpdate: new Date(state.lastIndexUpdate),
      isIndexing: state.isIndexing,
      isPreloading: false,
      coverage: state.indexStats.byType,
    };
  }, [state.indexStats, state.isIndexing, state.lastIndexUpdate]);

  return {
    // État
    isIndexing: state.isIndexing,
    lastIndexUpdate: state.lastIndexUpdate,
    stats: getIndexStats,

    // Actions (toutes asynchrones maintenant)
    search,
    quickSearch,
    buildSearchIndex,

    // Utilitaires
    getIndexEntry: (id: string) => state.index.get(id),
    getEntriesByType: (type: string) =>
      Array.from(state.index.values()).filter((entry) => entry.type === type),
  };
}
