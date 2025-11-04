const axios = require('axios');
const logger = require('../utils/logger');

// Configuration des services à rechercher
const SEARCH_SERVICES = {
  applications: {
    url: process.env.APPLICATION_SERVICE_URL || 'http://application-service:3002',
    searchFields: ['title', 'description', 'companyName', 'status', 'notes']
  },
  companies: {
    url: process.env.COMPANY_SERVICE_URL || 'http://company-service:3003',
    searchFields: ['name', 'sector', 'description', 'website', 'location']
  },
  contacts: {
    url: process.env.CONTACT_SERVICE_URL || 'http://contact-service:3004',
    searchFields: ['firstName', 'lastName', 'email', 'phone', 'position', 'companyName']
  },
  interviews: {
    url: process.env.INTERVIEW_SERVICE_URL || 'http://interview-service:3005',
    searchFields: ['type', 'status', 'notes', 'feedback', 'companyName']
  },
  calls: {
    url: process.env.CALL_SERVICE_URL || 'http://call-service:3008',
    searchFields: ['title', 'notes', 'status', 'outcome']
  }
};

/**
 * Recherche globale intelligente dans tous les modules
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
const globalSearch = async (req, res) => {
  try {
    const { query, modules = ['applications', 'companies', 'contacts', 'interviews', 'calls'], limit = 20 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Le terme de recherche doit contenir au moins 2 caractères'
      });
    }

    logger.info(`🔍 Recherche globale: "${query}" dans modules: ${modules.join(', ')}`);

    const searchPromises = modules.map(async (module) => {
      const service = SEARCH_SERVICES[module];
      if (!service) {
        logger.warn(`Module ${module} non configuré pour la recherche`);
        return { module, results: [], total: 0, error: 'Module non configuré' };
      }

      try {
        // Test de connectivité du service
        const healthResponse = await axios.get(`${service.url}/health`, { timeout: 2000 });
        if (healthResponse.data.status !== 'OK') {
          return { module, results: [], total: 0, error: 'Service non disponible' };
        }

        // Recherche dans le service spécifique
        const searchResponse = await axios.get(`${service.url}/api/search`, {
          params: { query, limit: Math.floor(limit / modules.length) },
          timeout: 5000,
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          }
        });

        return {
          module,
          results: searchResponse.data.results || [],
          total: searchResponse.data.total || 0,
          success: true
        };
      } catch (error) {
        logger.error(`Erreur lors de la recherche dans ${module}:`, error.message);
        return {
          module,
          results: [],
          total: 0,
          error: error.message,
          fallback: true
        };
      }
    });

    const results = await Promise.allSettled(searchPromises);

    const searchResults = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          module: 'unknown',
          results: [],
          total: 0,
          error: 'Erreur inconnue'
        };
      }
    });

    // Filtrer les résultats pour éviter les doublons
    const filteredResults = searchResults.filter(result => !result.error || result.fallback);

    // Trier par pertinence (nombre de résultats)
    filteredResults.sort((a, b) => b.total - a.total);

    // Calculer les statistiques
    const totalResults = filteredResults.reduce((sum, result) => sum + result.total, 0);
    const successfulModules = filteredResults.filter(result => !result.error).length;

    logger.info(`✅ Recherche globale terminée: ${totalResults} résultats trouvés dans ${successfulModules}/${modules.length} modules`);

    res.json({
      success: true,
      query,
      results: filteredResults,
      summary: {
        totalResults,
        modulesSearched: modules.length,
        successfulModules,
        query: query,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la recherche globale:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur lors de la recherche',
      message: error.message
    });
  }
};

/**
 * Recherche avancée avec filtres
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
const advancedSearch = async (req, res) => {
  try {
    const {
      query,
      modules = ['applications', 'companies', 'contacts', 'interviews', 'calls'],
      filters = {},
      sortBy = 'relevance',
      sortOrder = 'desc',
      limit = 20,
      offset = 0
    } = req.body;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Le terme de recherche doit contenir au moins 2 caractères'
      });
    }

    logger.info(`🔍 Recherche avancée: "${query}" avec filtres:`, filters);

    // Recherche dans tous les modules sélectionnés
    const searchPromises = modules.map(async (module) => {
      const service = SEARCH_SERVICES[module];
      if (!service) {
        return { module, results: [], total: 0, error: 'Module non configuré' };
      }

      try {
        const searchResponse = await axios.post(`${service.url}/api/search/advanced`, {
          query,
          filters,
          sortBy,
          sortOrder,
          limit: Math.floor(limit / modules.length),
          offset
        }, {
          timeout: 8000,
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          }
        });

        return {
          module,
          results: searchResponse.data.results || [],
          total: searchResponse.data.total || 0,
          success: true
        };
      } catch (error) {
        logger.error(`Erreur lors de la recherche avancée dans ${module}:`, error.message);
        return {
          module,
          results: [],
          total: 0,
          error: error.message
        };
      }
    });

    const results = await Promise.allSettled(searchPromises);

    const searchResults = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          module: 'unknown',
          results: [],
          total: 0,
          error: 'Erreur inconnue'
        };
      }
    });

    // Combiner et trier les résultats
    const allResults = [];
    let totalCount = 0;

    searchResults.forEach(result => {
      if (result.results && result.results.length > 0) {
        allResults.push(...result.results.map(item => ({
          ...item,
          _module: result.module,
          _score: item._score || 0
        })));
        totalCount += result.total;
      }
    });

    // Trier par score de pertinence
    allResults.sort((a, b) => {
      const scoreA = a._score || 0;
      const scoreB = b._score || 0;
      return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });

    // Appliquer pagination
    const paginatedResults = allResults.slice(offset, offset + limit);

    res.json({
      success: true,
      query,
      results: paginatedResults,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      summary: {
        modulesSearched: modules.length,
        totalResults: totalCount,
        returnedResults: paginatedResults.length
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la recherche avancée:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur lors de la recherche avancée',
      message: error.message
    });
  }
};

/**
 * Recherche par similarité (suggestions)
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
const similaritySearch = async (req, res) => {
  try {
    const { query, modules = ['applications', 'companies'], limit = 10 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Le terme de recherche doit contenir au moins 2 caractères'
      });
    }

    logger.info(`🔍 Recherche par similarité: "${query}"`);

    const searchPromises = modules.map(async (module) => {
      const service = SEARCH_SERVICES[module];
      if (!service) {
        return { module, suggestions: [] };
      }

      try {
        const searchResponse = await axios.get(`${service.url}/api/search/similar`, {
          params: { query, limit },
          timeout: 3000,
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          }
        });

        return {
          module,
          suggestions: searchResponse.data.suggestions || []
        };
      } catch (error) {
        logger.error(`Erreur lors de la recherche par similarité dans ${module}:`, error.message);
        return { module, suggestions: [] };
      }
    });

    const results = await Promise.allSettled(searchPromises);

    const suggestions = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return { module: 'unknown', suggestions: [] };
      }
    });

    // Combiner toutes les suggestions
    const allSuggestions = [];
    suggestions.forEach(result => {
      if (result.suggestions && result.suggestions.length > 0) {
        allSuggestions.push(...result.suggestions.map(suggestion => ({
          ...suggestion,
          module: result.module
        })));
      }
    });

    // Dédoublonner et limiter
    const uniqueSuggestions = allSuggestions
      .filter((item, index, self) =>
        index === self.findIndex(s => s.text === item.text && s.module === item.module)
      )
      .slice(0, limit);

    res.json({
      success: true,
      query,
      suggestions: uniqueSuggestions,
      total: uniqueSuggestions.length
    });

  } catch (error) {
    logger.error('Erreur lors de la recherche par similarité:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur lors de la recherche par similarité',
      message: error.message
    });
  }
};

/**
 * Recherche par tags/mots-clés
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
const tagSearch = async (req, res) => {
  try {
    const { tags, modules = ['applications', 'companies'], limit = 20 } = req.query;

    if (!tags) {
      return res.status(400).json({
        success: false,
        error: 'Au moins un tag est requis'
      });
    }

    const tagArray = Array.isArray(tags) ? tags : [tags];

    logger.info(`🔍 Recherche par tags:`, tagArray);

    const searchPromises = modules.map(async (module) => {
      const service = SEARCH_SERVICES[module];
      if (!service) {
        return { module, results: [], total: 0 };
      }

      try {
        const searchResponse = await axios.get(`${service.url}/api/search/tags`, {
          params: { tags: tagArray.join(','), limit },
          timeout: 4000,
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          }
        });

        return {
          module,
          results: searchResponse.data.results || [],
          total: searchResponse.data.total || 0,
          success: true
        };
      } catch (error) {
        logger.error(`Erreur lors de la recherche par tags dans ${module}:`, error.message);
        return { module, results: [], total: 0, error: error.message };
      }
    });

    const results = await Promise.allSettled(searchPromises);

    const searchResults = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return { module: 'unknown', results: [], total: 0, error: 'Erreur inconnue' };
      }
    });

    const totalResults = searchResults.reduce((sum, result) => sum + result.total, 0);

    res.json({
      success: true,
      tags: tagArray,
      results: searchResults,
      summary: {
        totalResults,
        modulesSearched: modules.length,
        tags: tagArray
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la recherche par tags:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur lors de la recherche par tags',
      message: error.message
    });
  }
};

module.exports = {
  globalSearch,
  advancedSearch,
  similaritySearch,
  tagSearch
};
