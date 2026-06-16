const { PrismaClient } = require('@prisma/client');

// ✅ Initialisation conditionnelle de Prisma
let prisma = null;
let databaseEnabled = false;

try {
  if (process.env.DATABASE_URL) {
    prisma = new PrismaClient();
    databaseEnabled = true;
    console.log('[PERSISTENCE] ✅ Base de données connectée');
  } else {
    console.log('[PERSISTENCE] ⚠️ DATABASE_URL non définie - Persistance désactivée');
  }
} catch (error) {
  console.error('[PERSISTENCE] ❌ Erreur initialisation Prisma:', error.message);
}

const METRICS_HISTORY_LIMIT_MAX = 60000;

/**
 * Colonne `public.system_metrics.timestamp` : TIMESTAMP **sans** fuseau, rempli par `NOW()` dans la session Postgres
 * du conteneur **`postgres`** (`TZ` / `PGTZ` = **`POSTGRES_SYSTEM_METRICS_TZ`**, défaut **UTC**).
 * La requête doit utiliser le **même** fuseau dans `AT TIME ZONE …` : sinon +2 h typiques si Postgres est en
 * **Europe/Paris** et le SQL supposait à tort **UTC**.
 */
function systemMetricsTimestampAtTzSql() {
  const raw = (process.env.POSTGRES_SYSTEM_METRICS_TZ || 'UTC').trim();
  const z = /^[A-Za-z0-9_+\/.-]{1,64}$/.test(raw) ? raw : 'UTC';
  const escaped = z.replace(/'/g, "''");
  return `(timestamp AT TIME ZONE '${escaped}')`;
}

function clampMetricsHistoryLimit(raw, fallback = 100) {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), METRICS_HISTORY_LIMIT_MAX);
}

function metricsHistoryBucketSeconds(startDate, endDate, limit) {
  if (!startDate || !endDate || !limit) return null;
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return null;
  }
  return Math.max(1, Math.ceil((endMs - startMs) / 1000 / Math.max(1, limit)));
}

function sqlEpochSeconds(value) {
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

/**
 * Driver SQL / Prisma peut renvoyer Date ou chaîne sans fuseau. On expose toujours de l’ISO UTC
 * pour le JSON afin que le front (fuseau navigateur) convertisse correctement.
 */
function toIsoUtcString(ts) {
  if (ts == null || ts === '') return null;
  if (ts instanceof Date) {
    const ms = ts.getTime();
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
  }
  const s = String(ts).trim();
  if (!s) return null;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    const d = new Date(`${s}Z`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const pg = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?$/.exec(s);
  if (pg) {
    const d = new Date(`${pg[1]}T${pg[2]}${pg[3] || ''}Z`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function mapRawSystemMetricsRows(rawResults) {
  return rawResults
    .map((row) => {
      const iso = toIsoUtcString(row.timestamp);
      if (!iso) return null;
      const timestamp = new Date(iso);
      const timestampMs = timestamp.getTime();
      return {
        id: `system_${timestamp.getTime()}`,
        timestamp: iso,
        timestampMs: Number.isFinite(timestampMs) ? timestampMs : undefined,
        cpuUsagePercent: row.cpu_usage_percent || 0,
        cpu_percent: row.cpu_usage_percent || 0,
        cpuCores: row.cpu_cores || 0,
        cpuLoadAverage1m: row.cpu_load_1,
        cpuLoadAverage5m: row.cpu_load_5,
        cpuLoadAverage15m: row.cpu_load_15,
        memoryUsagePercent: row.memory_usage_percent || 0,
        memory_usage_percent: row.memory_usage_percent || 0,
        memoryUsedBytes: row.memory_used_mb
          ? Number(row.memory_used_mb) * 1024 * 1024
          : 0,
        memoryTotalBytes: row.memory_total_mb
          ? Number(row.memory_total_mb) * 1024 * 1024
          : 0,
        memoryFreeBytes: row.memory_free_mb
          ? Number(row.memory_free_mb) * 1024 * 1024
          : 0,
        diskUsagePercent: row.disk_usage_percent,
        diskUsedBytes: row.disk_used_gb
          ? Math.round(Number(row.disk_used_gb) * 1024 * 1024 * 1024)
          : null,
        diskTotalBytes: row.disk_total_gb
          ? Math.round(Number(row.disk_total_gb) * 1024 * 1024 * 1024)
          : null,
        diskFreeBytes: row.disk_free_gb
          ? Math.round(Number(row.disk_free_gb) * 1024 * 1024 * 1024)
          : null,
        networkRxBytes: row.total_network_rx_bytes
          ? Number(row.total_network_rx_bytes)
          : null,
        networkTxBytes: row.total_network_tx_bytes
          ? Number(row.total_network_tx_bytes)
          : null,
        total_network_rx_bytes: row.total_network_rx_bytes
          ? Number(row.total_network_rx_bytes)
          : null,
        total_network_tx_bytes: row.total_network_tx_bytes
          ? Number(row.total_network_tx_bytes)
          : null,
        availabilityPercent: row.availability_percent,
        loadScore: row.load_score,
        errorCount: null,
        errorRate: null,
        responseTimeAvg: row.avg_response_time_ms,
        project_cpu_avg: row.project_cpu_avg ? Number(row.project_cpu_avg) : null,
        project_memory_mb: row.project_memory_mb
          ? Number(row.project_memory_mb)
          : null,
        createdAt: iso,
        _historySource: 'system_metrics',
      };
    })
    .filter(Boolean);
}

function mergeSystemMetricRows(rows, options = {}) {
  const { startDate = null, endDate = null } = options;
  const limit = clampMetricsHistoryLimit(options.limit, 100);
  const offset = Number.parseInt(options.offset, 10) || 0;
  const bucketSeconds = metricsHistoryBucketSeconds(startDate, endDate, limit);
  const startEpoch = sqlEpochSeconds(startDate);
  const byBucket = new Map();

  for (const row of rows) {
    const timestampMs = Number(row?.timestampMs ?? Date.parse(row?.timestamp || ''));
    if (!Number.isFinite(timestampMs)) continue;
    const bucketKey =
      bucketSeconds && startEpoch != null
        ? Math.floor((Math.floor(timestampMs / 1000) - startEpoch) / bucketSeconds)
        : timestampMs;
    const current = byBucket.get(bucketKey);
    const rowIsRaw = row._historySource === 'system_metrics';
    const currentIsRaw = current?._historySource === 'system_metrics';
    if (!current || (rowIsRaw && !currentIsRaw)) {
      byBucket.set(bucketKey, row);
    }
  }

  return Array.from(byBucket.values())
    .sort((a, b) => Number(b.timestampMs || 0) - Number(a.timestampMs || 0))
    .slice(offset, offset + limit)
    .map(({ _historySource, ...row }) => row);
}

function buildNearestContainerBlockIoLookup(rows, maxDistanceMs = 120000) {
  const points = Array.isArray(rows)
    ? rows
        .map((row) => {
          const tsIso =
            toIsoUtcString(row.timestamp) ||
            (row.timestamp instanceof Date
              ? row.timestamp.toISOString()
              : String(row.timestamp));
          const timeMs = Date.parse(tsIso);
          return {
            timeMs,
            blockReadBytes:
              row.blockReadBytes != null ? Number(row.blockReadBytes) : null,
            blockWriteBytes:
              row.blockWriteBytes != null ? Number(row.blockWriteBytes) : null,
          };
        })
        .filter((row) => Number.isFinite(row.timeMs))
    : [];

  return (targetMs) => {
    if (!Number.isFinite(targetMs) || points.length === 0) {
      return { blockReadBytes: null, blockWriteBytes: null };
    }
    let best = null;
    let bestDistance = Infinity;
    for (const point of points) {
      const distance = Math.abs(point.timeMs - targetMs);
      if (distance <= maxDistanceMs && distance < bestDistance) {
        best = point;
        bestDistance = distance;
      }
    }
    return best || { blockReadBytes: null, blockWriteBytes: null };
  };
}

/**
 * Service de persistance des métriques et logs
 * Gère l'enregistrement de toutes les données de monitoring dans la base de données
 */
class PersistenceService {
  constructor() {
    // Tables dont on a détecté l'absence (pour ne plus envoyer de requêtes = pas de spam Postgres)
    this._missingTables = new Set();
  }

  _isTableMissing(error, tableKey) {
    if (!error) return false;
    const msg = String(error.message || error || '');
    const code = error.code;
    const missing = code === 'P2021' || msg.includes('does not exist') || msg.includes('relation ') || msg.includes('does not exist in the current database');
    if (missing && tableKey) this._missingTables.add(tableKey);
    return missing;
  }

  _warnOnceMissing(tableKey, label) {
    this._warnedMissing = this._warnedMissing || {};
    if (this._warnedMissing[tableKey]) return;
    this._warnedMissing[tableKey] = true;
    console.warn(`[PERSISTENCE] Table ${label || tableKey} absente. Lancer: make db-push-all (si besoin: make rebuild-service SERVICE=auth-service avant)`);
  }

  /** Convertit une valeur numérique en BigInt (évite "cannot be converted to a BigInt because it is not an integer"). */
  _safeBigInt(val) {
    if (val == null || val === '') return BigInt(0);
    const n = Number(val);
    if (Number.isNaN(n)) return BigInt(0);
    return BigInt(Math.round(n));
  }

  /**
   * Vérifier si la base de données est disponible
   */
  isDatabaseEnabled() {
    return databaseEnabled && prisma !== null;
  }

  /**
   * Compteurs globaux des tables de persistance (route /persistence/stats).
   * Utilise le PrismaClient singleton du service — pas de client éphémère par requête.
   */
  async getPersistenceTableStats() {
    if (!this.isDatabaseEnabled()) {
      return {
        counts: {
          systemMetrics: 0,
          containerMetrics: 0,
          containerLogs: 0,
          securityMetrics: 0,
          events: 0,
          total: 0,
        },
        dataRange: { oldest: null, newest: null },
      };
    }

    const countTables = [
      ['systemMetricsSnapshots', 'system_metrics_snapshots'],
      ['containerMetricsSnapshots', 'container_metrics_snapshots'],
      ['containerLogs', 'container_logs'],
      ['securityMetrics', 'security_metrics'],
      ['securityLogs', 'security_logs'],
      ['events', 'system_events'],
      ['aggregatedLogs', 'aggregated_logs'],
      ['logCollectorLogs', 'log_collector_logs'],
      ['systemMetricsRaw', 'system_metrics'],
      ['containerMetricsRaw', 'container_metrics'],
      ['serviceAvailability', 'service_availability_history'],
      ['serviceNetwork', 'service_network_history'],
    ];

    const countTable = async (tableName) => {
      const tableExists = await prisma.$queryRawUnsafe(
        `SELECT to_regclass('public.${tableName}')::text AS table_name`,
      );
      if (!tableExists?.[0]?.table_name) return 0;

      const rows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::bigint AS count FROM public.${tableName}`,
      );
      return Number(rows?.[0]?.count || 0);
    };

    const counts = {};
    await Promise.all(
      countTables.map(async ([key, tableName]) => {
        counts[key] = await countTable(tableName).catch(() => 0);
      }),
    );

    counts.systemMetrics = counts.systemMetricsSnapshots + counts.systemMetricsRaw;
    counts.containerMetrics =
      counts.containerMetricsSnapshots + counts.containerMetricsRaw;
    counts.total = countTables
      .map(([key]) => counts[key] || 0)
      .reduce((sum, value) => sum + value, 0);

    let rangeRows = [{ oldest: null, newest: null }];
    try {
      rangeRows = await prisma.$queryRawUnsafe(`
        SELECT MIN(ts) AS oldest, MAX(ts) AS newest
        FROM (
          SELECT timestamp AS ts FROM public.system_metrics_snapshots
          UNION ALL SELECT timestamp AS ts FROM public.container_metrics_snapshots
          UNION ALL SELECT timestamp AS ts FROM public.system_events
          UNION ALL SELECT timestamp AS ts FROM public.aggregated_logs
          UNION ALL SELECT timestamp AS ts FROM public.log_collector_logs
          UNION ALL SELECT timestamp AS ts FROM public.system_metrics
          UNION ALL SELECT timestamp AS ts FROM public.container_metrics
          UNION ALL SELECT timestamp AS ts FROM public.service_availability_history
        ) AS persisted_timestamps
      `);
    } catch {
      rangeRows = [{ oldest: null, newest: null }];
    }
    const range = rangeRows?.[0] || {};

    return {
      counts,
      dataRange: {
        oldest: range.oldest || null,
        newest: range.newest || null,
      },
    };
  }

  /**
   * Sauvegarder un snapshot de métriques système
   */
  async saveSystemMetricsSnapshot(metricsData, additionalMetrics = {}) {
    if (!this.isDatabaseEnabled()) return null;
    if (this._missingTables.has('system_metrics_snapshots')) {
      this._warnOnceMissing('system_metrics_snapshots', 'system_metrics_snapshots');
      return null;
    }
    try {
      const snapshot = await prisma.systemMetricsSnapshot.create({
        data: {
          timestamp: new Date(),
          cpuUsagePercent: metricsData.cpu?.usage || metricsData.cpu?.percent || 0,
          cpuCores: metricsData.cpu?.cores || 1,
          cpuLoadAverage1m: metricsData.load?.average || metricsData.load?.[0] || null,
          cpuLoadAverage5m: metricsData.load?.[1] || null,
          cpuLoadAverage15m: metricsData.load?.[2] || null,
          memoryUsagePercent: metricsData.memory?.usage || metricsData.memory?.percent || 0,
          memoryUsedBytes: this._safeBigInt(metricsData.memory?.used) * BigInt(1024 * 1024), // MB to Bytes
          memoryTotalBytes: this._safeBigInt(metricsData.memory?.total) * BigInt(1024 * 1024),
          memoryFreeBytes: this._safeBigInt(metricsData.memory?.free) * BigInt(1024 * 1024),
          diskUsagePercent: metricsData.disk?.[0]?.usage || null,
          diskUsedBytes: metricsData.disk?.[0]?.used != null ? this._safeBigInt(metricsData.disk[0].used) * BigInt(1024 * 1024 * 1024) : null,
          diskTotalBytes: metricsData.disk?.[0]?.total != null ? this._safeBigInt(metricsData.disk[0].total) * BigInt(1024 * 1024 * 1024) : null,
          diskFreeBytes: metricsData.disk?.[0]?.total != null && metricsData.disk?.[0]?.used != null
            ? this._safeBigInt(Number(metricsData.disk[0].total) - Number(metricsData.disk[0].used)) * BigInt(1024 * 1024 * 1024)
            : null,
          networkRxBytes: metricsData.network?.rx != null ? this._safeBigInt(metricsData.network.rx) : null,
          networkTxBytes: metricsData.network?.tx != null ? this._safeBigInt(metricsData.network.tx) : null,
          // Nouvelles métriques calculées
          availabilityPercent: additionalMetrics.availabilityPercent || null,
          loadScore: additionalMetrics.loadScore || null,
          errorCount: additionalMetrics.errorCount || null,
          errorRate: additionalMetrics.errorRate || null,
          responseTimeAvg: additionalMetrics.responseTimeAvg || null,
        },
      });
      
      console.log(`[PERSISTENCE] ✅ Snapshot système sauvegardé: ${snapshot.id} (availability: ${snapshot.availabilityPercent}%, load: ${snapshot.loadScore})`);
      return snapshot;
    } catch (error) {
      if (this._isTableMissing(error, 'system_metrics_snapshots')) {
        this._warnOnceMissing('system_metrics_snapshots', 'system_metrics_snapshots');
        return null;
      }
      console.error('[PERSISTENCE] ❌ Erreur sauvegarde snapshot système:', error.message);
      throw error;
    }
  }

  /**
   * Sauvegarder les métriques d'un conteneur
   */
  async saveContainerMetricsSnapshot(containerName, metricsData) {
    if (!this.isDatabaseEnabled()) return null;
    if (this._missingTables.has('container_metrics_snapshots')) {
      this._warnOnceMissing('container_metrics_snapshots', 'container_metrics_snapshots');
      return null;
    }
    try {
      const snapshot = await prisma.containerMetricsSnapshot.create({
        data: {
          timestamp: new Date(),
          containerName,
          containerId: metricsData.containerId || null,
          status: metricsData.status || 'running',
          cpuUsagePercent: metricsData.cpu?.percentage || metricsData.cpu?.usage || null,
          cpuUsageNano: metricsData.cpu?.usage != null ? this._safeBigInt(metricsData.cpu.usage) : null,
          memoryUsagePercent: metricsData.memory?.percentage || null,
          memoryUsageBytes: metricsData.memory?.usage != null
            ? (typeof metricsData.memory.usage === 'number' && metricsData.memory.usage > 1000000
              ? this._safeBigInt(metricsData.memory.usage)
              : this._safeBigInt(metricsData.memory.usage * 1024 * 1024))
            : null,
          memoryLimitBytes: metricsData.memory?.limit != null
            ? (typeof metricsData.memory.limit === 'number' && metricsData.memory.limit > 1000000
              ? this._safeBigInt(metricsData.memory.limit)
              : this._safeBigInt(metricsData.memory.limit * 1024 * 1024))
            : null,
          networkRxBytes: metricsData.network?.rx != null ? this._safeBigInt(metricsData.network.rx) : null,
          networkTxBytes: metricsData.network?.tx != null ? this._safeBigInt(metricsData.network.tx) : null,
          blockReadBytes: metricsData.blockIO?.read != null ? this._safeBigInt(metricsData.blockIO.read) : null,
          blockWriteBytes: metricsData.blockIO?.write != null ? this._safeBigInt(metricsData.blockIO.write) : null,
          image: metricsData.image || null,
          labels: metricsData.labels || null,
        },
      });
      
      return snapshot;
    } catch (error) {
      if (this._isTableMissing(error, 'container_metrics_snapshots')) {
        this._warnOnceMissing('container_metrics_snapshots', 'container_metrics_snapshots');
        return null;
      }
      console.error(`[PERSISTENCE] ❌ Erreur sauvegarde métriques ${containerName}:`, error.message);
      throw error;
    }
  }

  /**
   * Sauvegarder plusieurs métriques de conteneurs en batch
   */
  async saveMultipleContainerMetrics(containersMetrics) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    
    const results = [];
    for (const [containerName, metrics] of Object.entries(containersMetrics)) {
      try {
        const snapshot = await this.saveContainerMetricsSnapshot(containerName, metrics);
        results.push(snapshot);
      } catch (error) {
        console.error(`[PERSISTENCE] Échec sauvegarde ${containerName}`);
      }
    }
    console.log(`[PERSISTENCE] ✅ ${results.length}/${Object.keys(containersMetrics).length} conteneurs sauvegardés`);
    return results;
  }

  /**
   * Sauvegarder les logs d'un conteneur
   */
  async saveContainerLogs(containerName, containerId, logs) {
    if (!this.isDatabaseEnabled()) return [];
    if (this._missingTables.has('container_logs')) {
      this._warnOnceMissing('container_logs', 'container_logs');
      return [];
    }
    try {
      if (!Array.isArray(logs) || logs.length === 0) return [];

      const savedLogs = [];
      for (const logEntry of logs) {
        // ✅ Le champ Prisma "log" attend une String ; logEntry peut être un objet (ex. { timestamp, log: "" })
        const rawLog = logEntry && (logEntry.log !== undefined ? logEntry.log : logEntry);
        let logString = typeof rawLog === 'string' ? rawLog : (rawLog && typeof rawLog === 'object' && rawLog.log != null ? String(rawLog.log) : JSON.stringify(logEntry ?? ''));
        if (typeof logString !== 'string') logString = JSON.stringify(logEntry ?? '');
        const { level, message } = this.parseLogEntry(logString);
        const messageStr = message != null && typeof message === 'string' ? message : (message != null ? JSON.stringify(message) : logString);
        
        const saved = await prisma.containerLog.create({
          data: {
            timestamp: logEntry.timestamp ? new Date(logEntry.timestamp) : new Date(),
            containerName,
            containerId,
            stream: logEntry.stream || 'stdout',
            log: logString,
            parsedLevel: level,
            parsedMessage: messageStr,
          },
        });
        
        savedLogs.push(saved);
      }
      
      console.log(`[PERSISTENCE] ✅ ${savedLogs.length} logs sauvegardés pour ${containerName}`);
      return savedLogs;
    } catch (error) {
      if (this._isTableMissing(error, 'container_logs')) {
        this._warnOnceMissing('container_logs', 'container_logs');
        return [];
      }
      console.error(`[PERSISTENCE] ❌ Erreur sauvegarde logs ${containerName}:`, error.message);
      throw error;
    }
  }

  /**
   * Parser une ligne de log pour extraire le niveau et le message
   */
  parseLogEntry(logLine) {
    const str = typeof logLine === 'string' ? logLine : (logLine != null ? String(logLine) : '');
    // Patterns communs pour détecter le niveau de log
    const patterns = {
      ERROR: /\b(ERROR|error|Error|ERR)\b/,
      WARN: /\b(WARN|warn|Warning|WARNING)\b/,
      INFO: /\b(INFO|info|Info)\b/,
      DEBUG: /\b(DEBUG|debug|Debug)\b/,
      FATAL: /\b(FATAL|fatal|Fatal|CRITICAL)\b/,
    };

    for (const [level, pattern] of Object.entries(patterns)) {
      if (pattern.test(str)) {
        return { level, message: str };
      }
    }

    return { level: null, message: str };
  }

  /**
   * Sauvegarder l'historique réseau d'un service
   */
  async saveServiceNetworkHistory(serviceName, networkData) {
    if (!this.isDatabaseEnabled()) {
      return null;
    }
    
    try {
      const history = await prisma.serviceNetworkHistory.create({
        data: {
          timestamp: new Date(),
          serviceName,
          requestCount: networkData.requestCount || 0,
          successCount: networkData.successCount || 0,
          errorCount: networkData.errorCount || 0,
          avgResponseTimeMs: networkData.avgResponseTimeMs || null,
          minResponseTimeMs: networkData.minResponseTimeMs || null,
          maxResponseTimeMs: networkData.maxResponseTimeMs || null,
          p95ResponseTimeMs: networkData.p95ResponseTimeMs || null,
          p99ResponseTimeMs: networkData.p99ResponseTimeMs || null,
          bytesReceived: this._safeBigInt(networkData.bytesReceived),
          bytesSent: this._safeBigInt(networkData.bytesSent),
          topEndpoints: networkData.topEndpoints || null,
        },
      });
      
      return history;
    } catch (error) {
      console.error(`[PERSISTENCE] ❌ Erreur sauvegarde réseau ${serviceName}:`, error.message);
      throw error;
    }
  }

  /**
   * Sauvegarder la disponibilité d'un service
   */
  async saveServiceAvailability(serviceName, availabilityData) {
    if (!this.isDatabaseEnabled()) return null;
    if (this._missingTables.has('service_availability_history')) {
      this._warnOnceMissing('service_availability_history', 'service_availability_history');
      return null;
    }
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const history = await prisma.serviceAvailabilityHistory.findMany({
        where: {
          serviceName,
          timestamp: {
            gte: last24h,
          },
        },
      });

      const totalChecks = history.length + 1; // +1 pour l'actuel
      const availableChecks = history.filter(h => h.isAvailable).length + (availabilityData.isAvailable ? 1 : 0);
      const uptimePercent = (availableChecks / totalChecks) * 100;

      const record = await prisma.serviceAvailabilityHistory.create({
        data: {
          timestamp: new Date(),
          serviceName,
          isAvailable: availabilityData.isAvailable || false,
          responseTimeMs: availabilityData.responseTimeMs || null,
          statusCode: availabilityData.statusCode || null,
          errorMessage: availabilityData.errorMessage || null,
          uptimePercent: parseFloat(uptimePercent.toFixed(2)),
        },
      });
      
      return record;
    } catch (error) {
      if (this._isTableMissing(error, 'service_availability_history')) {
        this._warnOnceMissing('service_availability_history', 'service_availability_history');
        return null;
      }
      console.error(`[PERSISTENCE] ❌ Erreur sauvegarde disponibilité ${serviceName}:`, (error && error.message) || error);
      throw error;
    }
  }

  /**
   * Sauvegarder les métriques de sécurité
   */
  async saveSecurityMetrics(securityData) {
    if (!this.isDatabaseEnabled()) {
      return null;
    }
    
    try {
      // Calculer le score de sécurité (0-100)
      const securityScore = this.calculateSecurityScore(securityData);

      const metrics = await prisma.securityMetric.create({
        data: {
          timestamp: new Date(),
          failedLoginAttempts: securityData.failedLoginAttempts || 0,
          successfulLogins: securityData.successfulLogins || 0,
          blockedIPs: securityData.blockedIPs || [],
          suspiciousActivities: securityData.suspiciousActivities || 0,
          potentialSqlInjections: securityData.potentialSqlInjections || 0,
          potentialXssAttempts: securityData.potentialXssAttempts || 0,
          rateLimitExceeded: securityData.rateLimitExceeded || 0,
          invalidTokenAttempts: securityData.invalidTokenAttempts || 0,
          securityScore,
          activeSecurityAlerts: securityData.activeSecurityAlerts || 0,
        },
      });
      
      console.log(`[PERSISTENCE] ✅ Métriques de sécurité sauvegardées (score: ${securityScore})`);
      return metrics;
    } catch (error) {
      console.error('[PERSISTENCE] ❌ Erreur sauvegarde métriques sécurité:', error.message);
      throw error;
    }
  }

  /**
   * Calculer le score de sécurité basé sur les métriques
   */
  calculateSecurityScore(data) {
    let score = 100;

    // Pénalités
    if (data.failedLoginAttempts > 10) score -= 10;
    if (data.failedLoginAttempts > 50) score -= 20;
    if (data.suspiciousActivities > 0) score -= 15;
    if (data.potentialSqlInjections > 0) score -= 25;
    if (data.potentialXssAttempts > 0) score -= 20;
    if (data.invalidTokenAttempts > 20) score -= 10;
    if (data.activeSecurityAlerts > 0) score -= 20;

    // Bonus si tout va bien
    if (data.failedLoginAttempts === 0 && data.suspiciousActivities === 0) {
      score = Math.min(score + 5, 100);
    }

    return Math.max(0, score);
  }

  /**
   * Créer un événement système
   */
  async createSystemEvent(eventData) {
    if (!this.isDatabaseEnabled()) {
      return null;
    }
    
    try {
      const event = await prisma.systemEvent.create({
        data: {
          timestamp: new Date(),
          type: eventData.type,
          severity: eventData.severity || 'INFO',
          source: eventData.source,
          title: eventData.title,
          description: eventData.description || null,
          metadata: eventData.metadata || null,
          isAlert: eventData.isAlert || false,
        },
      });
      
      console.log(`[PERSISTENCE] ✅ Événement créé: ${event.type} - ${event.title}`);
      return event;
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PERSISTENCE] ⚠️ Table SystemEvent non trouvée, création ignorée (mode développement)');
          return null;
        }
      }
      console.error('[PERSISTENCE] ❌ Erreur création événement:', error.message);
      throw error;
    }
  }

  /**
   * Nettoyer les anciennes données (> 30 jours par défaut)
   */
  async cleanOldData(daysToKeep = 30) {
    if (!this.isDatabaseEnabled()) {
      return 0;
    }
    
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const results = await Promise.allSettled([
        prisma.systemMetricsSnapshot.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
        prisma.containerMetricsSnapshot.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
        prisma.containerLog.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
        prisma.serviceNetworkHistory.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
        prisma.serviceAvailabilityHistory.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
        prisma.securityMetric.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
        prisma.aggregatedLog.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
      ]);

      const deleted = results
        .filter(r => r.status === 'fulfilled')
        .reduce((sum, r) => sum + (r.value?.count || 0), 0);

      console.log(`[PERSISTENCE] ✅ Nettoyage: ${deleted} enregistrements supprimés (> ${daysToKeep} jours)`);
      return deleted;
    } catch (error) {
      console.error('[PERSISTENCE] ❌ Erreur nettoyage:', error.message);
      throw error;
    }
  }

  /**
   * Récupérer l'historique des métriques système
   */
  async getSystemMetricsHistory(options = {}) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    
    const {
      limit: rawLimit = 100,
      offset = 0,
      startDate = null,
      endDate = null,
    } = options;
    const limit = clampMetricsHistoryLimit(rawLimit, 100);
    const offsetInt = Number.parseInt(offset, 10) || 0;
    const tsExpr = systemMetricsTimestampAtTzSql();

    const where = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    try {
      // ✅ CORRECTION : Utiliser $queryRaw pour accéder directement à la table system_metrics
      // créée par monitoring-c (qui contient project_cpu_avg et project_memory_mb)
      // au lieu de SystemMetricsSnapshot (Prisma) qui n'a pas ces champs
      // ✅ CORRECTION : Construire la requête avec des valeurs directement (sécurisé car les valeurs sont contrôlées)
      const conditions = [];
      if (where.timestamp) {
        if (where.timestamp.gte) {
          const gteDate = where.timestamp.gte instanceof Date ? where.timestamp.gte.toISOString() : where.timestamp.gte;
          conditions.push(`${tsExpr} >= '${gteDate}'::timestamptz`);
        }
        if (where.timestamp.lte) {
          const lteDate = where.timestamp.lte instanceof Date ? where.timestamp.lte.toISOString() : where.timestamp.lte;
          conditions.push(`${tsExpr} <= '${lteDate}'::timestamptz`);
        }
      }

      const whereSql = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
      const bucketSeconds = metricsHistoryBucketSeconds(startDate, endDate, limit);
      const startEpoch = sqlEpochSeconds(startDate);
      let query;

      if (bucketSeconds && startEpoch != null) {
        query = `
          WITH source AS (
            SELECT
              ${tsExpr} AS ts,
              cpu_load_1,
              cpu_load_5,
              cpu_load_15,
              cpu_cores,
              cpu_usage_percent,
              memory_total_mb,
              memory_used_mb,
              memory_free_mb,
              memory_usage_percent,
              disk_total_gb,
              disk_used_gb,
              disk_free_gb,
              disk_usage_percent,
              container_count,
              avg_response_time_ms,
              avg_cpu_percent,
              avg_memory_percent,
              availability_percent,
              load_score,
              total_network_rx_bytes,
              total_network_tx_bytes,
              project_cpu_avg,
              project_memory_mb
            FROM system_metrics
            ${whereSql}
          ),
          bucketed AS (
            SELECT
              FLOOR((EXTRACT(EPOCH FROM ts) - ${startEpoch}) / ${bucketSeconds})::bigint AS bucket,
              *
            FROM source
          )
          SELECT
            to_timestamp(MIN(EXTRACT(EPOCH FROM ts))) AS "timestamp",
            AVG(cpu_load_1) AS cpu_load_1,
            AVG(cpu_load_5) AS cpu_load_5,
            AVG(cpu_load_15) AS cpu_load_15,
            MAX(cpu_cores) AS cpu_cores,
            AVG(cpu_usage_percent) AS cpu_usage_percent,
            MAX(memory_total_mb) AS memory_total_mb,
            AVG(memory_used_mb) AS memory_used_mb,
            AVG(memory_free_mb) AS memory_free_mb,
            AVG(memory_usage_percent) AS memory_usage_percent,
            MAX(disk_total_gb) AS disk_total_gb,
            AVG(disk_used_gb) AS disk_used_gb,
            AVG(disk_free_gb) AS disk_free_gb,
            AVG(disk_usage_percent) AS disk_usage_percent,
            MAX(container_count) AS container_count,
            AVG(avg_response_time_ms) AS avg_response_time_ms,
            AVG(avg_cpu_percent) AS avg_cpu_percent,
            AVG(avg_memory_percent) AS avg_memory_percent,
            AVG(availability_percent) AS availability_percent,
            AVG(load_score) AS load_score,
            MAX(total_network_rx_bytes) AS total_network_rx_bytes,
            MAX(total_network_tx_bytes) AS total_network_tx_bytes,
            AVG(project_cpu_avg) AS project_cpu_avg,
            AVG(project_memory_mb) AS project_memory_mb
          FROM bucketed
          GROUP BY bucket
          ORDER BY "timestamp" DESC
          LIMIT ${limit + offsetInt} OFFSET 0
        `;
      } else {
        query = `
          SELECT
            ${tsExpr} AS "timestamp",
            cpu_load_1,
            cpu_load_5,
            cpu_load_15,
            cpu_cores,
            cpu_usage_percent,
            memory_total_mb,
            memory_used_mb,
            memory_free_mb,
            memory_usage_percent,
            disk_total_gb,
            disk_used_gb,
            disk_free_gb,
            disk_usage_percent,
            container_count,
            avg_response_time_ms,
            avg_cpu_percent,
            avg_memory_percent,
            availability_percent,
            load_score,
            total_network_rx_bytes,
            total_network_tx_bytes,
            project_cpu_avg,
            project_memory_mb
          FROM system_metrics
          ${whereSql}
          ORDER BY ${tsExpr} DESC LIMIT ${limit + offsetInt} OFFSET 0
        `;
      }
      
      console.log('[PERSISTENCE] 🔍 Requête SQL complète:', query);
      console.log('[PERSISTENCE] 🔍 Paramètres: limit=', limit, 'offset=', offset, 'startDate=', startDate, 'endDate=', endDate);
      
      let rawResults = [];
      try {
        rawResults = await prisma.$queryRawUnsafe(query);
      } catch (error) {
        if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('system_metrics')) {
          console.warn('[PERSISTENCE] ⚠️ Table system_metrics absente ou erreur, fallback sur SystemMetricsSnapshot (Prisma)');
          return this.getSystemMetricsHistoryFromSnapshot(options);
        }
        console.error('[PERSISTENCE] ❌ Erreur lors de la requête SQL:', error.message);
        throw error;
      }

      if (rawResults.length === 0) {
        console.warn('[PERSISTENCE] ⚠️ Aucune donnée dans system_metrics, fallback sur SystemMetricsSnapshot');
        return this.getSystemMetricsHistoryFromSnapshot(options);
      }

      console.log(`[PERSISTENCE] ✅ ${rawResults.length} résultats récupérés depuis system_metrics`);
      if (rawResults.length > 0) {
        // Convertir BigInt en Number pour les logs
        const firstRowForLog = { ...rawResults[0] };
        Object.keys(firstRowForLog).forEach(key => {
          if (typeof firstRowForLog[key] === 'bigint') {
            firstRowForLog[key] = Number(firstRowForLog[key]);
          }
        });
        console.log('[PERSISTENCE] 🔍 Premier résultat:', JSON.stringify(firstRowForLog, null, 2));
      }
      
      const rawRows = mapRawSystemMetricsRows(rawResults);
      let snapshotRows = [];
      try {
        snapshotRows = await this.getSystemMetricsHistoryFromSnapshot({
          ...options,
          offset: 0,
          limit: limit + offsetInt,
        });
      } catch (snapshotError) {
        console.warn(
          '[PERSISTENCE] ⚠️ Fusion snapshots ignorée:',
          snapshotError.message,
        );
      }

      return mergeSystemMetricRows([...rawRows, ...snapshotRows], {
        startDate,
        endDate,
        limit,
        offset: offsetInt,
      });
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('table')) {
        console.error('[PERSISTENCE] ❌ Erreur table system_metrics:', error.message);
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PERSISTENCE] ⚠️ Table system_metrics non trouvée, retour de données vides (mode développement)');
          console.warn('[PERSISTENCE] 💡 Vérifiez que monitoring-c a créé la table system_metrics dans PostgreSQL');
          return [];
        }
      }
      console.error('[PERSISTENCE] ❌ Erreur récupération métriques système:', error);
      throw error;
    }
  }

  /**
   * Fallback : récupérer l'historique depuis SystemMetricsSnapshot (Prisma)
   * utilisé quand system_metrics (monitoring-c) n'existe pas ou est vide
   */
  async getSystemMetricsHistoryFromSnapshot(options = {}) {
    if (!this.isDatabaseEnabled()) return [];
    const { offset = 0, startDate = null, endDate = null } = options;
    const limit = clampMetricsHistoryLimit(options.limit, 100);
    const offsetInt = Number.parseInt(offset, 10) || 0;
    const where = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }
    try {
      const bucketSeconds = metricsHistoryBucketSeconds(startDate, endDate, limit);
      const startEpoch = sqlEpochSeconds(startDate);
      let rows;

      if (bucketSeconds && startEpoch != null) {
        const conditions = [];
        if (where.timestamp?.gte) {
          conditions.push(`timestamp >= '${where.timestamp.gte.toISOString()}'::timestamptz`);
        }
        if (where.timestamp?.lte) {
          conditions.push(`timestamp <= '${where.timestamp.lte.toISOString()}'::timestamptz`);
        }
        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        rows = await prisma.$queryRawUnsafe(`
          WITH source AS (
            SELECT
              timestamp AS ts,
              "cpuUsagePercent",
              "cpuCores",
              "cpuLoadAverage1m",
              "cpuLoadAverage5m",
              "cpuLoadAverage15m",
              "memoryUsagePercent",
              "memoryUsedBytes",
              "memoryTotalBytes",
              "memoryFreeBytes",
              "diskUsagePercent",
              "diskUsedBytes",
              "diskTotalBytes",
              "diskFreeBytes",
              "networkRxBytes",
              "networkTxBytes",
              "availabilityPercent",
              "loadScore",
              "errorCount",
              "errorRate",
              "responseTimeAvg"
            FROM public.system_metrics_snapshots
            ${whereSql}
          ),
          bucketed AS (
            SELECT
              FLOOR((EXTRACT(EPOCH FROM ts) - ${startEpoch}) / ${bucketSeconds})::bigint AS bucket,
              *
            FROM source
          )
          SELECT
            CONCAT('system_snapshot_', bucket::text) AS id,
            to_timestamp(MIN(EXTRACT(EPOCH FROM ts))) AS timestamp,
            AVG("cpuUsagePercent") AS "cpuUsagePercent",
            MAX("cpuCores") AS "cpuCores",
            AVG("cpuLoadAverage1m") AS "cpuLoadAverage1m",
            AVG("cpuLoadAverage5m") AS "cpuLoadAverage5m",
            AVG("cpuLoadAverage15m") AS "cpuLoadAverage15m",
            AVG("memoryUsagePercent") AS "memoryUsagePercent",
            AVG("memoryUsedBytes") AS "memoryUsedBytes",
            MAX("memoryTotalBytes") AS "memoryTotalBytes",
            AVG("memoryFreeBytes") AS "memoryFreeBytes",
            AVG("diskUsagePercent") AS "diskUsagePercent",
            AVG("diskUsedBytes") AS "diskUsedBytes",
            MAX("diskTotalBytes") AS "diskTotalBytes",
            AVG("diskFreeBytes") AS "diskFreeBytes",
            MAX("networkRxBytes") AS "networkRxBytes",
            MAX("networkTxBytes") AS "networkTxBytes",
            AVG("availabilityPercent") AS "availabilityPercent",
            AVG("loadScore") AS "loadScore",
            SUM("errorCount") AS "errorCount",
            AVG("errorRate") AS "errorRate",
            AVG("responseTimeAvg") AS "responseTimeAvg"
          FROM bucketed
          GROUP BY bucket
          ORDER BY timestamp DESC
          LIMIT ${limit + offsetInt} OFFSET 0
        `);
      } else {
        rows = await prisma.systemMetricsSnapshot.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: limit + offsetInt,
          skip: 0,
        });
      }

      return rows.map((row) => {
        const tsIso =
          toIsoUtcString(row.timestamp) ||
          (row.timestamp instanceof Date ? row.timestamp.toISOString() : String(row.timestamp));
        const timestampMs = Date.parse(tsIso);
        return {
        id: row.id,
        timestamp: tsIso,
        timestampMs: Number.isFinite(timestampMs) ? timestampMs : undefined,
        cpuUsagePercent: row.cpuUsagePercent ?? 0,
        cpu_percent: row.cpuUsagePercent ?? 0,
        cpuCores: row.cpuCores ?? 0,
        memoryUsagePercent: row.memoryUsagePercent ?? 0,
        memory_usage_percent: row.memoryUsagePercent ?? 0,
        memoryUsedBytes: row.memoryUsedBytes != null ? Number(row.memoryUsedBytes) : 0,
        memoryTotalBytes: row.memoryTotalBytes != null ? Number(row.memoryTotalBytes) : 0,
        memoryFreeBytes: row.memoryFreeBytes != null ? Number(row.memoryFreeBytes) : 0,
        diskUsagePercent: row.diskUsagePercent ?? null,
        diskUsedBytes: row.diskUsedBytes != null ? Number(row.diskUsedBytes) : null,
        diskTotalBytes: row.diskTotalBytes != null ? Number(row.diskTotalBytes) : null,
        diskFreeBytes: row.diskFreeBytes != null ? Number(row.diskFreeBytes) : null,
        networkRxBytes: row.networkRxBytes != null ? Number(row.networkRxBytes) : null,
        networkTxBytes: row.networkTxBytes != null ? Number(row.networkTxBytes) : null,
        total_network_rx_bytes: row.networkRxBytes != null ? Number(row.networkRxBytes) : null,
        total_network_tx_bytes: row.networkTxBytes != null ? Number(row.networkTxBytes) : null,
        availabilityPercent: row.availabilityPercent ?? null,
        loadScore: row.loadScore ?? null,
        errorCount: row.errorCount != null ? Number(row.errorCount) : null,
        errorRate: row.errorRate ?? null,
        responseTimeAvg: row.responseTimeAvg ?? null,
        createdAt: tsIso,
      };
      }).slice(offsetInt, offsetInt + limit);
    } catch (e) {
      console.warn('[PERSISTENCE] ⚠️ Fallback SystemMetricsSnapshot échoué:', e.message);
      return [];
    }
  }

  /**
   * Récupérer l'historique des métriques d'un conteneur
   */
  async getContainerMetricsHistory(containerName, options = {}) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }

    const canonicalName = String(containerName || '')
      .replace(/^\//, '')
      .trim();
    if (!canonicalName) {
      return [];
    }

    const {
      limit: rawLimit = 100,
      offset = 0,
      startDate = null,
      endDate = null,
    } = options;
    const limit = clampMetricsHistoryLimit(rawLimit, 100);

    const where = { containerName: canonicalName };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    try {
      const escapedName = canonicalName.replace(/'/g, "''");
      const tsExpr = systemMetricsTimestampAtTzSql();
      const conditions = [`container_name = '${escapedName}'`];
      if (where.timestamp) {
        if (where.timestamp.gte) {
          const gteDate = where.timestamp.gte instanceof Date ? where.timestamp.gte.toISOString() : where.timestamp.gte;
          conditions.push(`${tsExpr} >= '${gteDate}'::timestamptz`);
        }
        if (where.timestamp.lte) {
          const lteDate = where.timestamp.lte instanceof Date ? where.timestamp.lte.toISOString() : where.timestamp.lte;
          conditions.push(`${tsExpr} <= '${lteDate}'::timestamptz`);
        }
      }

      const bucketSeconds = metricsHistoryBucketSeconds(startDate, endDate, limit);
      const startEpoch = sqlEpochSeconds(startDate);
      const rawQuery = bucketSeconds && startEpoch != null
        ? `
          WITH source AS (
            SELECT
              id,
              ${tsExpr} AS ts,
              container_name,
              cpu_percent,
              memory_mb,
              memory_limit_mb,
              memory_percent,
              network_rx_bytes,
              network_tx_bytes,
              response_time_ms,
              http_status
            FROM container_metrics
            WHERE ${conditions.join(' AND ')}
          ),
          bucketed AS (
            SELECT
              FLOOR((EXTRACT(EPOCH FROM ts) - ${startEpoch}) / ${bucketSeconds})::bigint AS bucket,
              *
            FROM source
          )
          SELECT
            MIN(id) AS id,
            to_timestamp(MIN(EXTRACT(EPOCH FROM ts))) AS "timestamp",
            MAX(container_name) AS container_name,
            AVG(cpu_percent) AS cpu_percent,
            AVG(memory_mb) AS memory_mb,
            MAX(memory_limit_mb) AS memory_limit_mb,
            AVG(memory_percent) AS memory_percent,
            MAX(network_rx_bytes) AS network_rx_bytes,
            MAX(network_tx_bytes) AS network_tx_bytes,
            AVG(response_time_ms) AS response_time_ms,
            MAX(http_status) AS http_status
          FROM bucketed
          GROUP BY bucket
          ORDER BY "timestamp" DESC
          LIMIT ${limit} OFFSET ${Number.parseInt(offset, 10) || 0}
        `
        : `
          SELECT
            id,
            ${tsExpr} AS "timestamp",
            container_name,
            cpu_percent,
            memory_mb,
            memory_limit_mb,
            memory_percent,
            network_rx_bytes,
            network_tx_bytes,
            response_time_ms,
            http_status
          FROM container_metrics
          WHERE ${conditions.join(' AND ')}
          ORDER BY ${tsExpr} DESC
          LIMIT ${limit} OFFSET ${Number.parseInt(offset, 10) || 0}
        `;

      const rawRows = await prisma.$queryRawUnsafe(rawQuery);
      if (Array.isArray(rawRows) && rawRows.length > 0) {
        const snapshotConditions = [`"containerName" = '${escapedName}'`];
        if (where.timestamp) {
          if (where.timestamp.gte) {
            const gteDate = where.timestamp.gte instanceof Date ? where.timestamp.gte.toISOString() : where.timestamp.gte;
            snapshotConditions.push(`"timestamp" >= '${gteDate}'::timestamptz`);
          }
          if (where.timestamp.lte) {
            const lteDate = where.timestamp.lte instanceof Date ? where.timestamp.lte.toISOString() : where.timestamp.lte;
            snapshotConditions.push(`"timestamp" <= '${lteDate}'::timestamptz`);
          }
        }
        const snapshotQuery = bucketSeconds && startEpoch != null
          ? `
            WITH source AS (
              SELECT
                id,
                "timestamp" AS ts,
                "containerName",
                "cpuUsagePercent",
                "memoryUsagePercent",
                "memoryUsageBytes",
                "memoryLimitBytes",
                "networkRxBytes",
                "networkTxBytes",
                "blockReadBytes",
                "blockWriteBytes",
                status
              FROM container_metrics_snapshots
              WHERE ${snapshotConditions.join(' AND ')}
            ),
            bucketed AS (
              SELECT
                FLOOR((EXTRACT(EPOCH FROM ts) - ${startEpoch}) / ${bucketSeconds})::bigint AS bucket,
                *
              FROM source
            )
            SELECT
              MIN(id) AS id,
              to_timestamp(MIN(EXTRACT(EPOCH FROM ts))) AS "timestamp",
              MAX("containerName") AS "containerName",
              AVG("cpuUsagePercent") AS "cpuUsagePercent",
              AVG("memoryUsagePercent") AS "memoryUsagePercent",
              MAX("memoryUsageBytes") AS "memoryUsageBytes",
              MAX("memoryLimitBytes") AS "memoryLimitBytes",
              MAX("networkRxBytes") AS "networkRxBytes",
              MAX("networkTxBytes") AS "networkTxBytes",
              MAX("blockReadBytes") AS "blockReadBytes",
              MAX("blockWriteBytes") AS "blockWriteBytes",
              MAX(status) AS status
            FROM bucketed
            GROUP BY bucket
            ORDER BY "timestamp" DESC
            LIMIT ${limit} OFFSET ${Number.parseInt(offset, 10) || 0}
          `
          : `
            SELECT
              id,
              "timestamp",
              "containerName",
              "cpuUsagePercent",
              "memoryUsagePercent",
              "memoryUsageBytes",
              "memoryLimitBytes",
              "networkRxBytes",
              "networkTxBytes",
              "blockReadBytes",
              "blockWriteBytes",
              status
            FROM container_metrics_snapshots
            WHERE ${snapshotConditions.join(' AND ')}
            ORDER BY "timestamp" DESC
            LIMIT ${limit} OFFSET ${Number.parseInt(offset, 10) || 0}
          `;
        const snapshotRows = await prisma.$queryRawUnsafe(snapshotQuery).catch((error) => {
          if (this._isTableMissing(error, 'container_metrics_snapshots')) {
            this._warnOnceMissing('container_metrics_snapshots', 'container_metrics_snapshots');
            return [];
          }
          throw error;
        });
        const nearestBlockIo = buildNearestContainerBlockIoLookup(snapshotRows);

        const rawMapped = rawRows.map((row) => {
          const tsIso = toIsoUtcString(row.timestamp) || String(row.timestamp);
          const timestampMs = Date.parse(tsIso);
          const memoryMb = row.memory_mb != null ? Number(row.memory_mb) : null;
          const memoryLimitMb = row.memory_limit_mb != null ? Number(row.memory_limit_mb) : null;
          const blockIo = nearestBlockIo(timestampMs);
          return {
            id: `container_metrics_${String(row.id)}`,
            timestamp: tsIso,
            ...(Number.isFinite(timestampMs) ? { timestampMs } : {}),
            containerName: row.container_name,
            containerId: null,
            status: row.http_status != null && Number(row.http_status) >= 500 ? 'degraded' : 'running',
            cpuUsagePercent: row.cpu_percent != null ? Number(row.cpu_percent) : null,
            cpu_percent: row.cpu_percent != null ? Number(row.cpu_percent) : null,
            cpuUsageNano: 0,
            memoryUsagePercent: row.memory_percent != null ? Number(row.memory_percent) : null,
            memory_percent: row.memory_percent != null ? Number(row.memory_percent) : null,
            memoryUsageBytes: memoryMb != null ? Math.round(memoryMb * 1024 * 1024) : null,
            memoryLimitBytes: memoryLimitMb != null ? Math.round(memoryLimitMb * 1024 * 1024) : null,
            networkRxBytes: row.network_rx_bytes != null ? Number(row.network_rx_bytes) : null,
            networkTxBytes: row.network_tx_bytes != null ? Number(row.network_tx_bytes) : null,
            responseTimeMs: row.response_time_ms != null ? Number(row.response_time_ms) : null,
            blockReadBytes: blockIo.blockReadBytes,
            blockWriteBytes: blockIo.blockWriteBytes,
            image: null,
            labels: null,
            createdAt: tsIso,
          };
        });
        const rawTimestamps = rawMapped
          .map((row) => row.timestampMs)
          .filter((timeMs) => Number.isFinite(timeMs));
        const snapshotOnlyRows = snapshotRows
          .map((row) => {
            const tsIso = toIsoUtcString(row.timestamp) || String(row.timestamp);
            const timestampMs = Date.parse(tsIso);
            return {
              id: `container_metrics_snapshot_${String(row.id)}`,
              timestamp: tsIso,
              ...(Number.isFinite(timestampMs) ? { timestampMs } : {}),
              containerName: row.containerName,
              containerId: null,
              status: row.status || 'running',
              cpuUsagePercent: row.cpuUsagePercent != null ? Number(row.cpuUsagePercent) : null,
              cpu_percent: row.cpuUsagePercent != null ? Number(row.cpuUsagePercent) : null,
              cpuUsageNano: 0,
              memoryUsagePercent: row.memoryUsagePercent != null ? Number(row.memoryUsagePercent) : null,
              memory_percent: row.memoryUsagePercent != null ? Number(row.memoryUsagePercent) : null,
              memoryUsageBytes: row.memoryUsageBytes != null ? Number(row.memoryUsageBytes) : null,
              memoryLimitBytes: row.memoryLimitBytes != null ? Number(row.memoryLimitBytes) : null,
              networkRxBytes: row.networkRxBytes != null ? Number(row.networkRxBytes) : null,
              networkTxBytes: row.networkTxBytes != null ? Number(row.networkTxBytes) : null,
              responseTimeMs: null,
              blockReadBytes: row.blockReadBytes != null ? Number(row.blockReadBytes) : null,
              blockWriteBytes: row.blockWriteBytes != null ? Number(row.blockWriteBytes) : null,
              image: null,
              labels: null,
              createdAt: tsIso,
            };
          })
          .filter((row) => {
            if (!Number.isFinite(row.timestampMs)) return false;
            return !rawTimestamps.some(
              (timeMs) => Math.abs(timeMs - row.timestampMs) <= 120000,
            );
          });
        return [...rawMapped, ...snapshotOnlyRows].sort(
          (a, b) => (b.timestampMs || 0) - (a.timestampMs || 0),
        );
      }
    } catch (rawError) {
      if (rawError.code === 'P2021' || rawError.message?.includes('does not exist') || rawError.message?.includes('relation') || rawError.message?.includes('container_metrics')) {
        console.warn('[PERSISTENCE] ⚠️ Table container_metrics indisponible, fallback snapshots:', rawError.message);
      } else {
        throw rawError;
      }
    }

    try {
      const rows = await prisma.containerMetricsSnapshot.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });
      return rows.map((row) => {
        const tsIso =
          toIsoUtcString(row.timestamp) ||
          (row.timestamp instanceof Date ? row.timestamp.toISOString() : String(row.timestamp));
        const timestampMs = Date.parse(tsIso);
        return {
          ...row,
          timestamp: tsIso,
          ...(Number.isFinite(timestampMs) ? { timestampMs } : {}),
        };
      });
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PERSISTENCE] ⚠️ Table ContainerMetricsSnapshot non trouvée, retour de données vides (mode développement)');
          return [];
        }
      }
      throw error;
    }
  }

  /**
   * Récupérer les logs d'un conteneur
   */
  async getContainerLogs(containerName, options = {}) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    
    const {
      limit = 100,
      offset = 0,
      stream = null,
      level = null,
      startDate = null,
      endDate = null,
      search = null,
    } = options;

    const where = { containerName };
    
    if (stream) where.stream = stream;
    if (level) where.parsedLevel = level;
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    if (search) {
      where.log = {
        contains: search,
        mode: 'insensitive',
      };
    }

    try {
      return await prisma.containerLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PERSISTENCE] ⚠️ Table ContainerLog non trouvée, retour de données vides (mode développement)');
          return [];
        }
      }
      throw error;
    }
  }

  /**
   * Sauvegarder un log agrégé (uniquement ERROR, WARN, FATAL)
   */
  async saveAggregatedLog(logData) {
    if (!this.isDatabaseEnabled()) {
      return null;
    }
    
    try {
      const { serviceName, level, message, metadata, stackTrace, userId, requestId } = logData;
      
      // Filtrer : ne stocker que les erreurs critiques et warnings importants
      const criticalLevels = ['ERROR', 'FATAL', 'WARN'];
      if (!criticalLevels.includes(level)) {
        // Ne pas stocker les logs INFO/DEBUG
        return null;
      }
      
      let metaJson = metadata ?? null;
      if (metaJson != null && typeof metaJson === 'object') {
        try {
          metaJson = JSON.parse(JSON.stringify(metaJson));
        } catch {
          metaJson = { _serializationError: true, raw: String(metadata) };
        }
      }

      const saved = await prisma.aggregatedLog.create({
        data: {
          timestamp: new Date(),
          serviceName: serviceName || 'unknown',
          level: level || 'INFO',
          message: message || '',
          metadata: metaJson,
          stackTrace: stackTrace || null,
          userId: userId || null,
          requestId: requestId || null,
        },
      });
      
      console.log(`[PERSISTENCE] ✅ Log agrégé sauvegardé: ${level} - ${serviceName}`);
      return saved;
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PERSISTENCE] ⚠️ Table AggregatedLog non trouvée, sauvegarde ignorée (mode développement)');
          return null;
        }
      }
      console.error('[PERSISTENCE] ❌ Erreur sauvegarde log agrégé:', error.message);
      throw error;
    }
  }

  /**
   * Sauvegarder plusieurs logs agrégés en batch
   */
  async saveMultipleAggregatedLogs(logs) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    
    const results = [];
    for (const logData of logs) {
      try {
        const saved = await this.saveAggregatedLog(logData);
        if (saved) {
          results.push(saved);
        }
      } catch (error) {
        console.error(`[PERSISTENCE] Échec sauvegarde log:`, error.message);
      }
    }
    
    console.log(`[PERSISTENCE] ✅ ${results.length}/${logs.length} logs sauvegardés`);
    return results;
  }

  /**
   * Récupérer les logs agrégés
   */
  async getAggregatedLogs(options = {}) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    
    try {
      const {
        limit = 100,
        offset = 0,
        serviceName = null,
        serviceNames = null,
        level = null,
        startDate = null,
        endDate = null,
        search = null,
      } = options;

      const where = {};

      const namesIn = Array.isArray(serviceNames)
        ? serviceNames.filter((s) => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
        : null;
      if (namesIn && namesIn.length > 0) {
        where.serviceName = { in: namesIn.slice(0, 32) };
      } else if (serviceName) {
        where.serviceName = serviceName;
      }
      if (level) where.level = level;
      
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }

      if (search) {
        where.message = {
          contains: search,
          mode: 'insensitive',
        };
      }

      return await prisma.aggregatedLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });
    } catch (error) {
      // Si la table n'existe pas (P2021) ou autre erreur, retourner un tableau vide
      if (error.code === 'P2021' || (error.message && error.message.includes('does not exist'))) {
        console.warn('[PERSISTENCE] Table aggregatedLog non trouvée, retour de données vides');
        return [];
      }
      console.error('[PERSISTENCE] Erreur récupération logs agrégés:', error.message);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques de disponibilité d'un service
   */
  async getServiceAvailabilityStats(serviceName, hours = 24) {
    const normalizedServiceName = String(serviceName || '').replace(/^\//, '').trim();
    const defaultStats = {
      serviceName: normalizedServiceName || serviceName,
      uptimePercent: 100,
      totalChecks: 0,
      availableChecks: 0,
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: 0,
    };
    if (!this.isDatabaseEnabled()) {
      return defaultStats;
    }
    
    const aliases = Array.from(new Set([
      normalizedServiceName,
      normalizedServiceName.replace(/^jobbingtrack-/, ''),
      normalizedServiceName.startsWith('jobbingtrack-') ? null : `jobbingtrack-${normalizedServiceName}`,
    ].filter(Boolean)));
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    let history;
    try {
      for (const candidate of aliases) {
        history = await prisma.serviceAvailabilityHistory.findMany({
          where: {
            serviceName: candidate,
            timestamp: { gte: since },
          },
          orderBy: { timestamp: 'asc' },
        });
        if (history.length > 0) {
          serviceName = candidate;
          break;
        }
      }
      history = history || [];
    } catch (error) {
      if (error.code === 'P2021' || (error.message && error.message.includes('does not exist'))) {
        return defaultStats;
      }
      throw error;
    }

    if (history.length === 0) {
      return {
        serviceName: normalizedServiceName || serviceName,
        uptimePercent: 100,
        totalChecks: 0,
        availableChecks: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
      };
    }

    const availableChecks = history.filter(h => h.isAvailable).length;
    const responseTimes = history
      .filter(h => h.responseTimeMs !== null)
      .map(h => h.responseTimeMs);

    return {
      serviceName,
      uptimePercent: (availableChecks / history.length) * 100,
      totalChecks: history.length,
      availableChecks,
      avgResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      lastCheck: history[history.length - 1],
    };
  }

  /**
   * Historique des checks health / temps de réponse par service (table `service_availability_history`).
   */
  async getServiceAvailabilityHistory(serviceName, options = {}) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    if (this._missingTables.has('service_availability_history')) {
      return [];
    }
    const { startDate, endDate } = options;
    const limit = clampMetricsHistoryLimit(
      typeof options.limit === 'number' ? options.limit : parseInt(String(options.limit ?? ''), 10),
      400
    );
    const normalizedServiceName = String(serviceName || '').replace(/^\//, '').trim();
    const aliases = Array.from(new Set([
      normalizedServiceName,
      normalizedServiceName.replace(/^jobbingtrack-/, ''),
      normalizedServiceName.startsWith('jobbingtrack-') ? null : `jobbingtrack-${normalizedServiceName}`,
    ].filter(Boolean)));
    const buildWhere = (candidate) => {
      const where = { serviceName: candidate };
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }
      return where;
    };
    try {
      for (const candidate of aliases) {
        const rows = await prisma.serviceAvailabilityHistory.findMany({
          where: buildWhere(candidate),
          orderBy: { timestamp: 'desc' },
          take: limit,
        });
        if (rows.length === 0) continue;
        const chronological = rows.slice().reverse();
        return chronological.map((row) => ({
          ...row,
          timestamp: toIsoUtcString(row.timestamp) || row.timestamp,
        }));
      }
      return [];
    } catch (error) {
      if (this._isTableMissing(error, 'service_availability_history')) {
        this._warnOnceMissing('service_availability_history', 'service_availability_history');
        return [];
      }
      throw error;
    }
  }

  /**
   * Récupérer les métriques de sécurité récentes
   */
  async getSecurityMetrics(hours = 24) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const aggregateModel = prisma.securityMetricAggregated || prisma.securityMetric;
    if (aggregateModel && typeof aggregateModel.findMany === 'function') {
      const aggregated = await aggregateModel.findMany({
        where: {
          timestamp: { gte: since },
        },
        orderBy: { timestamp: 'desc' },
      });
      if (aggregated.length > 0) return aggregated;
    }

    const rawModel = prisma.securityMetricTable;
    if (!rawModel || typeof rawModel.findMany !== 'function') return [];
    const rawRows = await rawModel.findMany({
      where: {
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
      take: 2000,
    });
    return rawRows.map((row) => this.mapRawSecurityMetric(row));
  }

  mapRawSecurityMetric(row) {
    const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const isScore = row.metricType === 'security_score';
    const criticalEvents = Number(meta.criticalEvents || 0);
    const intrusionAttempts = Number(meta.intrusionAttempts || 0);
    const ddosAttacks = Number(meta.ddosAttacks || 0);
    return {
      id: row.id,
      timestamp: row.timestamp,
      failedLoginAttempts: Number(meta.failedLoginAttempts || 0),
      successfulLogins: Number(meta.successfulLogins || 0),
      blockedIPs: Array.isArray(meta.blockedIPs) ? meta.blockedIPs : [],
      suspiciousActivities: Number(meta.suspiciousActivities || intrusionAttempts || 0),
      potentialSqlInjections: Number(meta.potentialSqlInjections || 0),
      potentialXssAttempts: Number(meta.potentialXssAttempts || 0),
      rateLimitExceeded: Number(meta.rateLimitExceeded || 0),
      invalidTokenAttempts: Number(meta.invalidTokenAttempts || 0),
      securityScore: isScore ? Number(row.value || 100) : Number(meta.securityScore || 100),
      activeSecurityAlerts: Number(meta.activeSecurityAlerts || criticalEvents || ddosAttacks || 0),
      intrusionAttempts: Number(meta.intrusionAttempts || 0),
      ddosAttacks: Number(meta.ddosAttacks || 0),
      rawMetricType: row.metricType,
      rawUnit: row.unit,
      rawPeriod: row.period,
      source: 'security_metrics',
    };
  }

  /**
   * Obtenir un résumé agrégé des métriques de sécurité
   */
  async getSecuritySummary(hours = 24) {
    if (!this.isDatabaseEnabled()) {
      return {
        avgSecurityScore: 100,
        totalFailedLogins: 0,
        totalSuspiciousActivities: 0,
        totalSecurityAlerts: 0,
        totalSqlInjectionAttempts: 0,
        totalXssAttempts: 0,
        uniqueBlockedIPs: 0,
      };
    }
    
    const metrics = await this.getSecurityMetrics(hours);
    
    if (metrics.length === 0) {
      return {
        avgSecurityScore: 100,
        totalFailedLogins: 0,
        totalSuspiciousActivities: 0,
        totalSecurityAlerts: 0,
        totalSqlInjectionAttempts: 0,
        totalXssAttempts: 0,
        uniqueBlockedIPs: 0,
        period: `${hours}h`,
        dataPoints: 0,
        source: 'empty',
      };
    }

    const total = metrics.reduce((acc, m) => ({
      failedLogins: acc.failedLogins + m.failedLoginAttempts,
      suspicious: acc.suspicious + m.suspiciousActivities,
      alerts: acc.alerts + m.activeSecurityAlerts,
      sqlInjections: acc.sqlInjections + m.potentialSqlInjections,
      xssAttempts: acc.xssAttempts + m.potentialXssAttempts,
      securityScore: acc.securityScore + (m.securityScore || 0),
    }), {
      failedLogins: 0,
      suspicious: 0,
      alerts: 0,
      sqlInjections: 0,
      xssAttempts: 0,
      securityScore: 0,
    });

    // Collecter tous les IPs bloqués uniques
    const allBlockedIPs = new Set();
    metrics.forEach(m => {
      if (Array.isArray(m.blockedIPs)) {
        m.blockedIPs.forEach(ip => allBlockedIPs.add(ip));
      }
    });

    return {
      avgSecurityScore: total.securityScore / metrics.length,
      totalFailedLogins: total.failedLogins,
      totalSuspiciousActivities: total.suspicious,
      totalSecurityAlerts: total.alerts,
      totalSqlInjectionAttempts: total.sqlInjections,
      totalXssAttempts: total.xssAttempts,
      uniqueBlockedIPs: allBlockedIPs.size,
      period: `${hours}h`,
      dataPoints: metrics.length,
      source: metrics.some((m) => m.source === 'security_metrics')
        ? 'security_metrics'
        : 'security_metrics_aggregated',
    };
  }
}

module.exports = new PersistenceService();


