/**
 * Service pour enregistrer l'historique des métriques dans la base de données
 */

const fs = require('fs').promises;
const path = require('path');

class MetricsHistoryService {
  constructor() {
    this.historyDir = '/tmp/metrics/history';
    this.maxHistoryEntries = 1000; // Garder les 1000 dernières entrées
    this.initializeHistoryDir();
  }

  async initializeHistoryDir() {
    try {
      await fs.mkdir(this.historyDir, { recursive: true });
      console.log('[HISTORY] Répertoire d\'historique initialisé:', this.historyDir);
    } catch (err) {
      console.error('[HISTORY] Erreur création répertoire:', err.message);
    }
  }

  /**
   * Enregistre un snapshot de métriques
   * @param {Object} metrics - Métriques à enregistrer
   */
  async saveSnapshot(metrics) {
    try {
      const timestamp = Date.now();
      const filename = `metrics_${timestamp}.json`;
      const filepath = path.join(this.historyDir, filename);
      
      const snapshot = {
        timestamp: new Date().toISOString(),
        unix_timestamp: timestamp,
        ...metrics
      };
      
      await fs.writeFile(filepath, JSON.stringify(snapshot, null, 2), 'utf8');
      
      // Sauvegarder aussi les métriques par service si disponibles
      if (metrics.containers && Array.isArray(metrics.containers)) {
        await this.saveServiceSnapshots(metrics.containers, timestamp);
      }
      
      // Nettoyer les anciens fichiers si nécessaire
      await this.cleanOldSnapshots();
      
      console.log('[HISTORY] Snapshot sauvegardé:', filename);
      return true;
    } catch (err) {
      console.error('[HISTORY] Erreur sauvegarde snapshot:', err.message);
      return false;
    }
  }

  /**
   * Enregistre les snapshots individuels par service
   * @param {Array} containers - Liste des conteneurs
   * @param {number} timestamp - Timestamp
   */
  async saveServiceSnapshots(containers, timestamp) {
    try {
      for (const container of containers) {
        const serviceName = container.name.replace('jobbingtrack-', '');
        const serviceDir = path.join(this.historyDir, 'services', serviceName);
        
        // Créer le répertoire du service si nécessaire
        await fs.mkdir(serviceDir, { recursive: true });
        
        const filename = `${timestamp}.json`;
        const filepath = path.join(serviceDir, filename);
        
        const serviceSnapshot = {
          timestamp: new Date().toISOString(),
          unix_timestamp: timestamp,
          service: serviceName,
          ...container
        };
        
        await fs.writeFile(filepath, JSON.stringify(serviceSnapshot, null, 2), 'utf8');
      }
      
      console.log(`[HISTORY] Snapshots par service sauvegardés: ${containers.length} services`);
    } catch (err) {
      console.error('[HISTORY] Erreur sauvegarde snapshots services:', err.message);
    }
  }

  /**
   * Récupère l'historique d'un service spécifique
   * @param {string} serviceName - Nom du service
   * @param {Object} options - Options
   */
  async getServiceHistory(serviceName, options = {}) {
    try {
      const { 
        startTime = Date.now() - 3600000,
        endTime = Date.now(),
        limit = 100
      } = options;
      
      const serviceDir = path.join(this.historyDir, 'services', serviceName);
      
      try {
        await fs.access(serviceDir);
      } catch {
        return []; // Répertoire n'existe pas
      }
      
      const files = await fs.readdir(serviceDir);
      const metricsFiles = files
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const timestamp = parseInt(f.replace('.json', ''));
          return { filename: f, timestamp };
        })
        .filter(f => f.timestamp >= startTime && f.timestamp <= endTime)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
      
      const history = [];
      for (const file of metricsFiles) {
        try {
          const content = await fs.readFile(
            path.join(serviceDir, file.filename),
            'utf8'
          );
          history.push(JSON.parse(content));
        } catch (err) {
          console.error('[HISTORY] Erreur lecture fichier:', file.filename, err.message);
        }
      }
      
      return history;
    } catch (err) {
      console.error('[HISTORY] Erreur récupération historique service:', err.message);
      return [];
    }
  }

  /**
   * Nettoie les anciens snapshots pour ne garder que les N derniers
   */
  async cleanOldSnapshots() {
    try {
      const files = await fs.readdir(this.historyDir);
      const metricsFiles = files
        .filter(f => f.startsWith('metrics_') && f.endsWith('.json'))
        .sort()
        .reverse(); // Plus récents en premier
      
      if (metricsFiles.length > this.maxHistoryEntries) {
        const filesToDelete = metricsFiles.slice(this.maxHistoryEntries);
        for (const file of filesToDelete) {
          await fs.unlink(path.join(this.historyDir, file));
        }
        console.log(`[HISTORY] Nettoyé ${filesToDelete.length} anciens snapshots`);
      }
    } catch (err) {
      console.error('[HISTORY] Erreur nettoyage:', err.message);
    }
  }

  /**
   * Récupère l'historique des métriques
   * @param {Object} options - Options de récupération
   * @returns {Promise<Array>} Historique des métriques
   */
  async getHistory(options = {}) {
    try {
      const { 
        startTime = Date.now() - 3600000, // 1 heure par défaut
        endTime = Date.now(),
        limit = 100
      } = options;
      
      const files = await fs.readdir(this.historyDir);
      const metricsFiles = files
        .filter(f => f.startsWith('metrics_') && f.endsWith('.json'))
        .map(f => {
          const timestamp = parseInt(f.replace('metrics_', '').replace('.json', ''));
          return { filename: f, timestamp };
        })
        .filter(f => f.timestamp >= startTime && f.timestamp <= endTime)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
      
      const history = [];
      for (const file of metricsFiles) {
        try {
          const content = await fs.readFile(
            path.join(this.historyDir, file.filename),
            'utf8'
          );
          history.push(JSON.parse(content));
        } catch (err) {
          console.error('[HISTORY] Erreur lecture fichier:', file.filename, err.message);
        }
      }
      
      return history;
    } catch (err) {
      console.error('[HISTORY] Erreur récupération historique:', err.message);
      return [];
    }
  }

  /**
   * Récupère les statistiques sur une période
   * @param {Object} options - Options
   * @returns {Promise<Object>} Statistiques
   */
  async getStats(options = {}) {
    try {
      const history = await this.getHistory(options);
      
      if (history.length === 0) {
        return {
          count: 0,
          avg_cpu: 0,
          max_cpu: 0,
          min_cpu: 0,
          avg_memory: 0,
          max_memory: 0,
          min_memory: 0
        };
      }
      
      const cpuValues = history.map(h => h.cpu_percent || 0);
      const memoryValues = history.map(h => h.memory_percent || 0);
      
      return {
        count: history.length,
        period: {
          start: history[history.length - 1]?.timestamp,
          end: history[0]?.timestamp
        },
        cpu: {
          avg: (cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length).toFixed(2),
          max: Math.max(...cpuValues).toFixed(2),
          min: Math.min(...cpuValues).toFixed(2)
        },
        memory: {
          avg: (memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length).toFixed(2),
          max: Math.max(...memoryValues).toFixed(2),
          min: Math.min(...memoryValues).toFixed(2)
        }
      };
    } catch (err) {
      console.error('[HISTORY] Erreur calcul stats:', err.message);
      return null;
    }
  }
}

module.exports = new MetricsHistoryService();

