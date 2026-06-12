import {
  SystemMetrics,
  ServiceMetrics,
  ContainerMetrics,
  ContainerMetricEntry,
  MetricsData,
  NetworkMetricsOverview,
  ResponseTimeOverview,
  ErrorMetricsOverview,
  HealthOverview,
  UserCustomization,
} from "@/lib/interfaces";
import {
  formatServiceName,
  getServiceUrl,
  getServicePort,
} from "@/lib/utils/metricsUtils";
import { normalizeMetricTimestampToIso } from "@/lib/utils/date";
import { cacheManager } from "@/lib/cache/cacheManager";
import { FRONTEND_URLS } from "@/config/ports.config";
import { analyticsService } from "@/lib/api/analytics.service";
import {
  buildMetricsAggregatorUrl,
  getMetricsAggregatorClientBase,
} from "@/lib/metrics/metricsAggregatorClient";

export function getCentralMetricsAggregatorBase(): string {
  return getMetricsAggregatorClientBase();
}

class CentralMetricsService {
  private apiUrl: string;
  private prometheusUrl: string;
  private metricsAggregatorUrl: string;
  private token: string | null = null;
  private customization: UserCustomization | null = null;
  // Cache pour réduire les requêtes
  private metricsCache: MetricsData | null = null;
  private cacheTimestamp: number = 0;
  private cacheDuration: number = 5000; // 5 secondes
  private maxCacheSize: number = 50;
  private isLoading: boolean = false;
  private loadingPromises: Map<string, Promise<any>> = new Map();
  private aggregatorUnavailableUntil: number = 0;
  private static readonly AGGREGATOR_BACKOFF_MS = 30000; // 30 secondes
  private servicesListCache: { data: any[]; expiresAt: number } | null = null;
  private static readonly SERVICES_LIST_CACHE_MS = 30000;

  constructor() {
    this.apiUrl = FRONTEND_URLS.api;
    this.prometheusUrl =
      process.env.NEXT_PUBLIC_PROMETHEUS_URL || "http://localhost:9090";
    // Côté navigateur, passer par le proxy Next pour injecter METRICS_API_KEY côté serveur.
    this.metricsAggregatorUrl = getCentralMetricsAggregatorBase();
    this.updateToken();
  }

  private updateToken() {
    this.token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
  }

  private isAuthenticated(): boolean {
    return !!(this.token && this.token.trim() !== "");
  }

  private isValidToken(): boolean {
    if (!this.isAuthenticated()) return false;

    // En mode développement, accepter les tokens mock
    if (
      process.env.NODE_ENV === "development" &&
      this.token?.startsWith("mock-jwt-token")
    ) {
      return true;
    }

    // Pour les vrais tokens, vérifier le format
    return this.token!.split(".").length === 3;
  }

  // Gestion du cache pour éviter les requêtes multiples
  private getCachedMetrics(): MetricsData | null {
    // ✅ OPTIMISATION : Cache avec vérification de taille mémoire
    const now = Date.now();
    if (this.metricsCache && now - this.cacheTimestamp < this.cacheDuration) {
      // Vérifier la taille approximative du cache (JSON stringifié)
      try {
        const size = JSON.stringify(this.metricsCache).length / 1024 / 1024; // MB
        if (size > this.maxCacheSize) {
          // Cache trop volumineux, le vider
          console.warn(
            "[CENTRAL METRICS] ⚠️ Cache trop volumineux, vidage automatique",
            size.toFixed(2) + "MB",
          );
          this.clearCache();
          return null;
        }
      } catch (e) {
        // Erreur de sérialisation, vider le cache
        this.clearCache();
        return null;
      }
      return this.metricsCache;
    }
    return null;
  }

  private setCachedMetrics(metrics: MetricsData): void {
    // ✅ OPTIMISATION : Vérifier la taille avant de mettre en cache
    try {
      const size = JSON.stringify(metrics).length / 1024 / 1024; // MB
      if (size > this.maxCacheSize) {
        console.warn(
          "[CENTRAL METRICS] ⚠️ Métriques trop volumineuses pour le cache",
          size.toFixed(2) + "MB",
        );
        // Ne pas mettre en cache si trop volumineux
        return;
      }
    } catch (e) {
      // Erreur de sérialisation, ne pas mettre en cache
      return;
    }
    this.metricsCache = metrics;
    this.cacheTimestamp = Date.now();
  }

  private clearCache(): void {
    this.metricsCache = null;
    this.cacheTimestamp = 0;
  }

  // Méthode pour éviter les requêtes simultanées identiques
  private async getWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    // Vérifier si une requête identique est déjà en cours
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    const promise = fetcher().finally(() => {
      this.loadingPromises.delete(key);
    });

    this.loadingPromises.set(key, promise);
    return promise;
  }

  // Récupération de la personnalisation utilisateur
  async getUserCustomization(): Promise<UserCustomization | null> {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/v1/users/customization`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${this.token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.customization = data.customization;
          return data.customization;
        }
      }
    } catch (error) {
      console.error("Erreur récupération personnalisation:", error);
    }

    // Fallback vers localStorage
    if (typeof window !== "undefined") {
      const localCustomization = localStorage.getItem("userCustomization");
      if (localCustomization) {
        try {
          this.customization = JSON.parse(localCustomization);
          return this.customization;
        } catch (error) {
          console.error("Erreur parsing personnalisation localStorage:", error);
        }
      }
    }

    // Valeurs par défaut
    this.customization = {
      theme: "light",
      language: "fr",
      dashboardLayout: "default",
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      features: {
        analytics: true,
        maintenance: true,
        security: true,
      },
      metrics: {
        refreshInterval: 30000,
        defaultView: "system",
        showContainers: true,
        showServices: true,
      },
    };

    return this.customization;
  }

  // Sauvegarde de la personnalisation utilisateur
  async saveUserCustomization(
    customization: Partial<UserCustomization>,
  ): Promise<boolean> {
    try {
      if (this.customization) {
        this.customization = { ...this.customization, ...customization };

        // Sauvegarder en localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "userCustomization",
            JSON.stringify(this.customization),
          );
        }

        return true;
      }
    } catch (error) {
      console.error("Erreur sauvegarde personnalisation:", error);
    }

    return false;
  }

  // Récupération des métriques système depuis Prometheus via l'API Gateway
  async getSystemMetrics(): Promise<SystemMetrics | null> {
    // Mettre à jour le token
    this.updateToken();

    // Si pas authentifié, retourner null
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      // Métriques système via metrics-aggregator uniquement (aggregator récupère depuis monitoring-c + BDD)
      const response = await fetch(
        buildMetricsAggregatorUrl("metrics"),
        {
          headers: {
            Accept: "application/json",
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
          signal: AbortSignal.timeout(10000),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.system) {
          return {
            cpu: {
              // Le backend renvoie 'percent', on le mappe vers 'usage'
              usage: data.system.cpu?.percent ?? data.system.cpu?.usage ?? 0,
              cores: data.system.cpus || data.system.cpu?.cores || "N/A",
              model:
                data.system.cpu?.model || data.system.architecture || "N/A",
            },
            memory: {
              total:
                data.system.memory_total || data.system.memory?.total || "N/A",
              used: data.system.memory?.used || "N/A",
              free: data.system.memory?.free || "N/A",
              // Le backend renvoie 'percent', on le mappe vers 'usage'
              usage:
                data.system.memory?.percent ?? data.system.memory?.usage ?? 0,
            },
            load: {
              average:
                data.system.load?.average || data.system.uptime
                  ? (data.system.uptime / 3600).toFixed(1)
                  : 0,
              cores: data.system.cpus || data.system.load?.cores || "N/A",
            },
            disk: data.system.disk || [],
          };
        }
      }

      // Dernier fallback : données système basiques du navigateur
      if (
        typeof navigator !== "undefined" &&
        "hardwareConcurrency" in navigator
      ) {
        return {
          cpu: {
            usage: 0, // Le navigateur ne peut pas mesurer l'utilisation CPU du système
            cores: navigator.hardwareConcurrency,
            model: "N/A",
          },
          memory: {
            total: "N/A",
            used: "N/A",
            free: "N/A",
            usage: 0,
          },
          load: {
            average: 0,
            cores: "N/A",
          },
          disk: [],
        };
      }

      return null;
    } catch (error) {
      console.error("Erreur récupération métriques système:", error);
      return null;
    }
  }

  // Récupération des métriques de conteneurs depuis Prometheus via le service agrégateur
  async getContainerMetrics(): Promise<ContainerMetrics | null> {
    // Mettre à jour le token
    this.updateToken();

    // Si pas authentifié, retourner null
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      // Métriques conteneurs via metrics-aggregator uniquement
      const response = await fetch(
        buildMetricsAggregatorUrl("metrics"),
        {
          headers: {
            Accept: "application/json",
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
          signal: AbortSignal.timeout(10000),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.containers && Object.keys(data.containers).length > 0) {
          return data.containers;
        }
      }
      return {};
    } catch (error) {
      console.error("Erreur récupération métriques conteneurs:", error);
      return null;
    }
  }

  // Récupération des métriques de services depuis Prometheus
  async getServiceMetrics(): Promise<{ [key: string]: ServiceMetrics } | null> {
    // Mettre à jour le token
    this.updateToken();

    // Si pas authentifié, retourner null
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      // Métriques Docker via metrics-aggregator uniquement
      const response = await fetch(
        buildMetricsAggregatorUrl("metrics"),
        {
          headers: {
            Accept: "application/json",
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
          signal: AbortSignal.timeout(10000),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const containers =
          data.containers && typeof data.containers === "object"
            ? data.containers
            : {};
        if (Object.keys(containers).length > 0) return containers;
        if (data.services && typeof data.services === "object")
          return data.services;
      }

      // Fallback vers la liste des services depuis Docker
      const dockerServices = await this.getDockerServices();
      if (dockerServices) {
        const serviceMetrics: { [key: string]: ServiceMetrics } = {};

        Object.keys(dockerServices).forEach((serviceName) => {
          const service = dockerServices[serviceName];
          serviceMetrics[serviceName] = {
            name: service.name,
            url: service.url,
            port: service.port,
            status: service.status,
            responseTime: "N/A",
            version: "N/A",
            metrics: service.metrics,
            lastCheck: service.lastCheck,
          };
        });

        return serviceMetrics;
      }

      // Dernier fallback : retourner une liste vide au lieu de null
      return {};
    } catch (error) {
      console.error("Erreur récupération métriques services:", error);
      return null;
    }
  }

  // Requête Prometheus générique via l'API Gateway (endpoint non disponible)
  private async queryPrometheus(query: string): Promise<string | null> {
    // Endpoint Prometheus non disponible, retourner null
    console.log("[PROMETHEUS] Endpoint non disponible");
    return null;
  }

  // Récupération des métriques de maintenance depuis l'API Gateway
  async getMaintenanceMetrics(): Promise<any> {
    // Endpoint de maintenance non disponible, retourner des données par défaut
    console.log(
      "[MAINTENANCE] Endpoint non disponible, utilisation des données par défaut",
    );
    return { maintenances: [] };
  }

  // Récupération des logs de sécurité depuis l'API Gateway
  async getSecurityLogs(
    level: string = "error",
    limit: number = 100,
  ): Promise<any> {
    // Endpoint de sécurité non disponible, retourner des données par défaut
    console.log(
      "[SECURITY] Endpoint non disponible, utilisation des données par défaut",
    );
    return { logs: [] };
  }

  // Récupération complète des métriques depuis différentes sources
  async getAllMetrics(): Promise<MetricsData | null> {
    try {
      const [systemMetrics, containerMetrics, serviceMetrics, customization] =
        await Promise.all([
          this.getSystemMetrics(),
          this.getContainerMetrics(),
          this.getServiceMetrics(),
          this.getUserCustomization(),
        ]);

      if (!systemMetrics) return null;

      return {
        services: serviceMetrics || {},
        system: systemMetrics,
        containers: containerMetrics || {},
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Erreur récupération toutes métriques:", error);
      return null;
    }
  }

  // Récupération des métriques système depuis cAdvisor (non accessible depuis les conteneurs)
  async getCadvisorMetrics(): Promise<any> {
    console.log("[CADVISOR] Non accessible depuis les conteneurs");
    return null;
  }

  /**
   * Normalise la réponse du metrics-aggregator (une seule source : monitoring-c → aggregator → frontend).
   * L'aggregator expose lastMetricsData avec responseTime, health, servicesList, system.monitoringC.
   */
  private formatMetricsFromAggregator(data: any): MetricsData {
    const timestamp = data.timestamp || new Date().toISOString();
    return {
      system: data.system || {},
      containers: data.containers || {},
      services: data.services || {},
      servicesList: data.servicesList || Object.values(data.services || {}),
      timestamp,
      network: data.network,
      responseTime: data.responseTime,
      errors: data.errors,
      health: data.health,
      overallLoadScore: data.system?.monitoringC?.load_score,
      monitoringC: data.system?.monitoringC
        ? {
            avg_response_time_ms:
              data.system.monitoringC.avg_response_time_ms ??
              data.responseTime?.average_ms,
            avg_cpu_percent: data.system.monitoringC.avg_cpu_percent,
            avg_memory_percent: data.system.monitoringC.avg_memory_percent,
            container_count: data.system.monitoringC.container_count,
            load_score: data.system.monitoringC.load_score,
            availability_percent:
              data.system.monitoringC.availability_percent ??
              data.health?.availability_percent,
            network: data.system.monitoringC.network,
            error_rate_per_min: data.system.monitoringC.error_rate_per_min,
            services_errors: data.system.monitoringC.services_errors,
          }
        : undefined,
    } as MetricsData;
  }

  /**
   * Récupération des métriques : uniquement via metrics-aggregator.
   * L'aggregator récupère les données depuis monitoring-c et les persiste en BDD ; le frontend ne parle qu'à l'aggregator.
   */
  async getAggregatorMetrics(): Promise<MetricsData | null> {
    this.updateToken();
    const headers: HeadersInit = { Accept: "application/json" };
    if (this.token)
      (headers as Record<string, string>)["Authorization"] =
        `Bearer ${this.token}`;

    const now = Date.now();
    if (now < this.aggregatorUnavailableUntil) return null;

    try {
      const response = await fetch(buildMetricsAggregatorUrl("metrics"), {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (!response?.ok) return null;
      const text = await response.text().catch(() => "");
      if (!text?.trim()) return null;
      const data = JSON.parse(text);
      return this.formatMetricsFromAggregator(data);
    } catch (e) {
      this.aggregatorUnavailableUntil =
        now + CentralMetricsService.AGGREGATOR_BACKOFF_MS;
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[CENTRAL METRICS] metrics-aggregator injoignable, retry dans 30s",
        );
      }
      return null;
    }
  }

  // Récupération de tous les services (docker/services/all — cache + dédup requêtes)
  async getAllServices(): Promise<any[] | null> {
    return this.getWithCache("getAllServices", () =>
      this.fetchAllServicesUncached(),
    );
  }

  private async fetchAllServicesUncached(): Promise<any[] | null> {
    const now = Date.now();
    if (
      this.servicesListCache &&
      this.servicesListCache.expiresAt > now &&
      this.servicesListCache.data.length > 0
    ) {
      return this.servicesListCache.data;
    }

    // Données de test par défaut pour éviter les erreurs 404
    const defaultServices = [
      {
        name: "auth-service",
        status: "running",
        url: "http://localhost:5005",
        health: { status: "online" },
      },
      {
        name: "api-gateway",
        status: "running",
        url: "http://localhost:5002",
        health: { status: "online" },
      },
      {
        name: "dashboard-service",
        status: "running",
        url: "http://localhost:5015",
        health: { status: "online" },
      },
      {
        name: "frontend",
        status: "running",
        url: "http://localhost:5003",
        health: { status: "online" },
      },
    ];

    try {
      // Liste des services : metrics-aggregator (docker/services/all ou /api/v1/metrics)
      const dockerRes = await fetch(
        buildMetricsAggregatorUrl("docker/services/all"),
        {
          headers: {
            Accept: "application/json",
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
          signal: AbortSignal.timeout(20000),
        },
      );
      if (dockerRes.ok) {
        const dockerData = await dockerRes.json();
        const list = dockerData.services || [];
        if (list.length > 0) {
          this.servicesListCache = {
            data: list,
            expiresAt: now + CentralMetricsService.SERVICES_LIST_CACHE_MS,
          };
          return list;
        }
      }
      const metricsRes = await fetch(
        buildMetricsAggregatorUrl("metrics"),
        {
          headers: {
            Accept: "application/json",
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        const fromMetrics =
          data.servicesList && data.servicesList.length > 0
            ? data.servicesList
            : data.services && typeof data.services === "object"
              ? Object.values(data.services)
              : [];
        if (fromMetrics.length > 0) {
          this.servicesListCache = {
            data: fromMetrics,
            expiresAt: now + CentralMetricsService.SERVICES_LIST_CACHE_MS,
          };
          return fromMetrics;
        }
      }
    } catch (error: any) {
      if (
        error.name === "TimeoutError" &&
        process.env.NODE_ENV === "development"
      ) {
        console.warn(
          "[SERVICES] Timeout récupération services (metrics-aggregator)",
        );
      }
    }

    // Fallback API Gateway : éviter si l’agrégateur est en backoff (réduit les timeouts en rafale)
    if (now >= this.aggregatorUnavailableUntil) {
      try {
        const response = await fetch(`${this.apiUrl}/api/v1/services`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          signal: AbortSignal.timeout(12000),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.services?.length) {
            this.servicesListCache = {
              data: data.services,
              expiresAt: now + CentralMetricsService.SERVICES_LIST_CACHE_MS,
            };
            return data.services;
          }
        }
      } catch {
        /* gateway optionnel */
      }
    }

    if (this.servicesListCache?.data?.length) {
      return this.servicesListCache.data;
    }

    console.log("[SERVICES] ℹ️ Utilisation des services par défaut");
    return defaultServices;
  }

  // Récupération des logs d'un service : via metrics-aggregator (page détail service ou Services & Logs)
  async getServiceLogs(
    serviceName: string,
    options?: { lines?: number; since?: string | null; until?: string | null },
  ): Promise<any | null> {
    try {
      const name = serviceName.startsWith("jobbingtrack-")
        ? serviceName
        : `jobbingtrack-${serviceName}`;
      const params = new URLSearchParams();
      params.set("lines", String(options?.lines ?? 100));
      if (options?.since) params.set("since", options.since);
      if (options?.until) params.set("until", options.until);
      const res = await fetch(
        `${buildMetricsAggregatorUrl(`docker/service/${encodeURIComponent(name)}/logs`)}?${params.toString()}`,
        {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  }

  async getAggregatorLogs(
    containerName: string,
    options?: { limit?: number; start?: number; end?: number },
  ): Promise<any | null> {
    return this.getServiceLogs(containerName, { lines: options?.limit ?? 100 });
  }

  // Redémarrage d'un service
  async restartService(serviceName: string): Promise<any | null> {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/v1/services/${serviceName}/restart`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${this.token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error(`Erreur redémarrage service ${serviceName}:`, error);
    }

    return null;
  }

  // Récupération de la liste des services depuis Docker (non accessible depuis les conteneurs)
  async getDockerServices(): Promise<{ [key: string]: any } | null> {
    console.log("[DOCKER] API Docker non accessible depuis les conteneurs");
    return null;
  }

  // Méthode principale pour récupérer les métriques avec cache et fallback intelligent
  async fetchMetrics(): Promise<MetricsData | null> {
    // Mettre à jour le token au cas où il aurait changé
    this.updateToken();

    // Si pas de token valide, retourner des données par défaut sans faire de requêtes
    if (!this.isValidToken()) {
      console.log(
        "[CENTRAL METRICS] ⚠️ Pas de token valide, utilisation des données par défaut",
      );
      return {
        services: {},
        system: {
          cpu: { usage: "N/A", cores: "N/A", model: "N/A" },
          memory: { total: "N/A", used: "N/A", free: "N/A", usage: "N/A" },
          load: { average: "N/A", cores: "N/A" },
          disk: [],
        },
        containers: {},
        timestamp: new Date().toISOString(),
      };
    }

    // Vérifier le cache d'abord
    const cachedMetrics = this.getCachedMetrics();
    if (cachedMetrics) {
      // Log désactivé pour réduire la pollution de la console (réactiver en mode debug)
      // console.log('[CENTRAL METRICS] ✅ Métriques récupérées depuis le cache')
      return cachedMetrics;
    }

    return this.getWithCache("fetchMetrics", async () => {
      try {
        const metrics = await this.getAggregatorMetrics();
        if (!metrics) {
          console.warn("[CENTRAL METRICS] metrics-aggregator non disponible");
          return null;
        }
        this.setCachedMetrics(metrics);
        return metrics;
      } catch (error) {
        console.error(
          "[CENTRAL METRICS] ❌ Erreur lors de la récupération des métriques:",
          error,
        );
        this.clearCache();
        return null;
      }
    });
  }

  /**
   * Formate les métriques depuis monitoring-c vers le format attendu par le frontend
   */
  private formatMetricsFromMonitoringC(data: any): MetricsData {
    // ✅ CORRECTION : Exposer avg_cpu_percent et avg_memory_percent directement
    // pour que le frontend puisse les utiliser
    const timestamp = data.timestamp
      ? new Date(data.timestamp * 1000).toISOString()
      : new Date().toISOString();

    // Convertir les conteneurs en services
    const containers = Array.isArray(data.containers) ? data.containers : [];
    const servicesList: ServiceMetrics[] = containers.map((container: any) => {
      const rawName = container.name || "unknown-service";
      const serviceType = rawName.replace(/^jobbingtrack-/, "");
      const baseServiceType = serviceType
        .replace(/-prod$/, "")
        .replace(/-preview$/, "")
        .replace(/-staging$/, "");
      const displayName = formatServiceName(rawName);
      const networkRxMb = container.network_rx_bytes
        ? container.network_rx_bytes / (1024 * 1024)
        : 0;
      const networkTxMb = container.network_tx_bytes
        ? container.network_tx_bytes / (1024 * 1024)
        : 0;
      const responseTimeMs =
        typeof container.response_time_ms === "number" &&
        container.response_time_ms > 0
          ? parseFloat(container.response_time_ms.toFixed(2))
          : null;
      const httpStatus =
        typeof container.http_status === "number" ? container.http_status : 0;
      const cpuPercent =
        typeof container.cpu_percent === "number"
          ? parseFloat(container.cpu_percent.toFixed(2))
          : 0;
      const memoryMb =
        typeof container.memory_mb === "number"
          ? parseFloat(container.memory_mb.toFixed(2))
          : 0;
      const memoryLimitMb =
        typeof container.memory_limit_mb === "number"
          ? parseFloat(container.memory_limit_mb.toFixed(2))
          : 0;
      const memoryPercent =
        typeof container.memory_percent === "number"
          ? parseFloat(container.memory_percent.toFixed(2))
          : 0;
      const memoryLimitSource =
        typeof container.memory_limit_source === "string"
          ? container.memory_limit_source
          : null;
      const memoryRawLimitMb =
        typeof container.memory_raw_limit_mb === "number"
          ? parseFloat(container.memory_raw_limit_mb.toFixed(2))
          : null;
      const memoryStackLimitMb =
        typeof container.memory_stack_limit_mb === "number"
          ? container.memory_stack_limit_mb
          : null;
      const memoryServiceBudgetMb =
        typeof container.memory_service_budget_mb === "number"
          ? container.memory_service_budget_mb
          : null;

      let status: ServiceMetrics["status"] = "unknown";
      let healthStatus: ServiceMetrics["healthStatus"] = "unknown";
      let healthError: string | undefined = undefined;

      // ✅ CORRECTION : Déterminer le statut correctement
      if (httpStatus === 200) {
        status = "running";
        healthStatus = "online";
      } else if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
        status = "degraded";
        healthStatus = "degraded";
        healthError = `HTTP Error ${httpStatus}`;
      } else if (httpStatus && httpStatus >= 500) {
        status = "degraded";
        healthStatus = "degraded";
        healthError = `HTTP Error ${httpStatus}`;
      } else if (
        httpStatus === 0 &&
        (responseTimeMs === null || responseTimeMs === 0)
      ) {
        // ✅ CORRECTION : Si http_status est 0 ET pas de temps de réponse, le service est offline
        // Mais si on a un temps de réponse même avec http_status 0, c'est peut-être un problème de parsing
        status = "offline";
        healthStatus = "offline";
        healthError = "Service unreachable";
      } else if (httpStatus > 0 && httpStatus !== 200) {
        // ✅ CORRECTION : Si on a un code HTTP mais pas 200, c'est dégradé
        status = "degraded";
        healthStatus = "degraded";
        healthError = `HTTP ${httpStatus}`;
      } else {
        // ✅ CORRECTION : Si on a un temps de réponse mais pas de code HTTP valide, considérer comme running
        // (peut arriver si le parsing curl a échoué mais le service répond)
        if (responseTimeMs !== null && responseTimeMs > 0) {
          status = "running";
          healthStatus = "online";
        } else {
          status = "offline";
          healthStatus = "offline";
          healthError = "No response";
        }
      }

      return {
        id: rawName,
        rawName,
        displayName,
        serviceType: baseServiceType,
        name: displayName,
        url: getServiceUrl(baseServiceType),
        port: getServicePort(baseServiceType),
        status,
        responseTime: responseTimeMs !== null ? `${responseTimeMs} ms` : "N/A",
        responseTimeMs,
        version: "N/A",
        healthStatus,
        healthError,
        health: {
          status: healthStatus,
          responseTime:
            responseTimeMs !== null ? `${responseTimeMs} ms` : "N/A",
          error: healthError,
        },
        lastCheck: timestamp,
        pids: null,
        errorRatePerMin: 0,
        errorCount5m: 0,
        metrics: {
          memory: {
            usage: memoryMb,
            limit: memoryLimitMb,
            percentage: memoryPercent,
            usageMb: memoryMb,
            limitMb: memoryLimitMb,
            limitSource: memoryLimitSource,
            rawLimitMb: memoryRawLimitMb,
            stackLimitMb: memoryStackLimitMb,
            serviceBudgetMb: memoryServiceBudgetMb,
          },
          cpu: {
            usage: cpuPercent,
            system: cpuPercent,
            percentage: cpuPercent,
            perCore: 0,
          },
          network: {
            rx_bytes: container.network_rx_bytes || 0,
            tx_bytes: container.network_tx_bytes || 0,
            rx_mb: networkRxMb,
            tx_mb: networkTxMb,
          },
        },
        networkMb: { rx: networkRxMb, tx: networkTxMb },
      };
    });

    const servicesMap: { [key: string]: ServiceMetrics } = {};
    const containersMap: Record<string, ContainerMetricEntry> = {};
    servicesList.forEach((service) => {
      const key = service.rawName || service.name;
      servicesMap[key] = service;
      containersMap[key] = {
        name: service.rawName || service.name,
        memory: { usage: 0, limit: 0, percentage: 0, usageMb: 0, limitMb: 0 },
        cpu: { usage: 0, system: 0, percentage: 0, perCore: 0 },
        network: {
          rx_bytes: service.metrics?.network?.rx_bytes ?? 0,
          tx_bytes: service.metrics?.network?.tx_bytes ?? 0,
          rx_mb: service.metrics?.network?.rx_mb,
          tx_mb: service.metrics?.network?.tx_mb,
        },
        status: service.status,
        response_time_ms: null,
        error_count_5m: 0,
        error_rate_per_min: 0,
        pids: null,
      };
    });

    // ✅ CORRECTION : Utiliser network.total_rx_mb et total_tx_mb depuis monitoring C en priorité
    const totalNetworkRxMb =
      data.network?.total_rx_mb !== undefined && data.network.total_rx_mb > 0
        ? data.network.total_rx_mb
        : servicesList.reduce(
            (sum, service) => sum + (service.networkMb?.rx ?? 0),
            0,
          );
    const totalNetworkTxMb =
      data.network?.total_tx_mb !== undefined && data.network.total_tx_mb > 0
        ? data.network.total_tx_mb
        : servicesList.reduce(
            (sum, service) => sum + (service.networkMb?.tx ?? 0),
            0,
          );

    // Utiliser les statistiques calculées par monitoring-c si disponibles (accepter 0 pour affichage)
    const avgResponseTimeMs =
      typeof data.avg_response_time_ms === "number" &&
      !Number.isNaN(data.avg_response_time_ms)
        ? parseFloat(data.avg_response_time_ms.toFixed(2))
        : servicesList.length > 0 && servicesList.some((s) => s.responseTimeMs)
          ? servicesList
              .filter((s) => s.responseTimeMs)
              .reduce((sum, s) => sum + (s.responseTimeMs || 0), 0) /
            servicesList.filter((s) => s.responseTimeMs).length
          : null;

    // ✅ CORRECTION : Calculer la disponibilité correctement
    // Un service est disponible s'il est running ET a un http_status valide (200 ou >= 400 mais running)
    // Un service est indisponible s'il est stopped, offline, ou http_status === 0 sans métriques
    const availabilityPercent =
      typeof data.availability_percent === "number" &&
      !Number.isNaN(data.availability_percent)
        ? parseFloat(data.availability_percent.toFixed(2))
        : servicesList.length > 0
          ? (servicesList.filter((s) => {
              // Service disponible si :
              // 1. Status est running/healthy/online
              // 2. OU http_status === 200
              // 3. OU http_status >= 400 mais status est running (dégradé mais disponible)
              if (
                s.status === "running" ||
                s.status === "healthy" ||
                s.status === "online" ||
                s.healthStatus === "online" ||
                s.healthStatus === "healthy"
              ) {
                return true;
              }
              if (s.http_status === 200) {
                return true;
              }
              const http = s.http_status ?? 0;
              if (s.status === "running" && http >= 400) {
                return true; // Dégradé mais disponible
              }
              // Si http_status === 0 mais on a des métriques CPU/mémoire, le service est disponible
              if (
                http === 0 &&
                ((s.cpu_percent ?? 0) > 0 || (s.memory_mb ?? 0) > 0)
              ) {
                return true;
              }
              return false;
            }).length /
              servicesList.length) *
            100
          : 100;

    const loadScore =
      typeof data.load_score === "number" && !Number.isNaN(data.load_score)
        ? parseFloat(data.load_score.toFixed(2))
        : undefined;

    const numericResponseTimes = servicesList
      .filter(
        (s) => typeof s.responseTimeMs === "number" && s.responseTimeMs > 0,
      )
      .map((s) => s.responseTimeMs as number);

    // ✅ CORRECTION : Exposer avg_cpu_percent et avg_memory_percent directement
    const avgCpuPercent =
      typeof data.avg_cpu_percent === "number" ? data.avg_cpu_percent : null;
    const avgMemoryPercent =
      typeof data.avg_memory_percent === "number"
        ? data.avg_memory_percent
        : null;

    // ✅ CORRECTION : Calculer les métriques agrégées des conteneurs JobbingTrack
    const jobbingtrackContainers = containers.filter((c: any) =>
      c.name?.startsWith("jobbingtrack-"),
    );

    // ✅ CORRECTION : Utiliser project_memory_mb directement depuis monitoring-c
    // ✅ CORRECTION : Ne pas accepter 0 comme valeur valide si aucun conteneur n'est trouvé
    let projectMemoryMb: number | null = null;
    if (
      typeof data.project_memory_mb === "number" &&
      !isNaN(data.project_memory_mb)
    ) {
      // ✅ CORRECTION : Si project_memory_mb est 0, vérifier s'il y a des conteneurs JobbingTrack
      // Si oui, 0 est valide (mémoire non utilisée). Si non, c'est "non disponible"
      if (data.project_memory_mb > 0 || jobbingtrackContainers.length > 0) {
        projectMemoryMb = data.project_memory_mb;
      } else {
        // 0 et aucun conteneur = non disponible
        projectMemoryMb = null;
      }
    }

    // Si project_memory_mb n'est pas disponible, calculer depuis les conteneurs
    if (projectMemoryMb === null && jobbingtrackContainers.length > 0) {
      projectMemoryMb = jobbingtrackContainers.reduce(
        (sum: number, c: any) => sum + (c.memory_mb || 0),
        0,
      );
    } else if (projectMemoryMb === null) {
      projectMemoryMb = null;
    }
    // Logs désactivés en prod pour éviter le spam (réactiver en debug si besoin)

    // ✅ CORRECTION : Utiliser project_cpu_avg directement depuis monitoring-c
    // ✅ CORRECTION : Ne pas accepter 0.0 comme valeur valide si aucun conteneur n'est trouvé
    // monitoring-c retourne 0.0 quand project_container_count == 0, ce qui signifie "non disponible"
    let projectCpuAvg: number | null = null;
    if (
      typeof data.project_cpu_avg === "number" &&
      !isNaN(data.project_cpu_avg)
    ) {
      // ✅ CORRECTION : Si project_cpu_avg est 0.0, vérifier s'il y a des conteneurs JobbingTrack
      // Si oui, 0.0 est valide (système inactif). Si non, c'est "non disponible"
      if (data.project_cpu_avg > 0 || jobbingtrackContainers.length > 0) {
        projectCpuAvg = data.project_cpu_avg;
      } else {
        // 0.0 et aucun conteneur = non disponible
        projectCpuAvg = null;
      }
    }

    // Si project_cpu_avg n'est pas disponible, calculer depuis les conteneurs
    if (projectCpuAvg === null && jobbingtrackContainers.length > 0) {
      const totalCpu = jobbingtrackContainers.reduce((sum: number, c: any) => {
        const cpu =
          typeof c.cpu_percent === "number" && !isNaN(c.cpu_percent)
            ? c.cpu_percent
            : 0;
        return sum + cpu;
      }, 0);
      projectCpuAvg = totalCpu / jobbingtrackContainers.length;
    } else if (projectCpuAvg === null) {
      projectCpuAvg = null;
    }

    // ✅ CORRECTION : Calculer avgCpuPercentContainers (moyenne CPU des conteneurs JobbingTrack)
    const avgCpuPercentContainers =
      jobbingtrackContainers.length > 0
        ? jobbingtrackContainers.reduce(
            (sum: number, c: any) => sum + (c.cpu_percent || 0),
            0,
          ) / jobbingtrackContainers.length
        : projectCpuAvg || 0;

    // Calculer les totaux pour le pourcentage par rapport aux limites
    const totalCpuPercent = jobbingtrackContainers.reduce(
      (sum: number, c: any) => sum + (c.cpu_percent || 0),
      0,
    );
    const totalMemoryLimitMb = jobbingtrackContainers.reduce(
      (sum: number, c: any) => sum + (c.memory_limit_mb || 0),
      0,
    );

    // ✅ NOUVEAU : Calculer le pourcentage de mémoire projet par rapport à la mémoire système totale
    const systemTotalMemoryMb = data.memory?.total_mb || 0;
    const projectMemoryMbSafe = projectMemoryMb ?? 0;
    const memoryProjectPercent =
      systemTotalMemoryMb > 0
        ? (projectMemoryMbSafe / systemTotalMemoryMb) * 100
        : 0;
    // Pourcentage par rapport à la limite des conteneurs (pour affichage détaillé)
    const avgMemoryPercentContainers =
      totalMemoryLimitMb > 0
        ? (projectMemoryMbSafe / totalMemoryLimitMb) * 100
        : avgMemoryPercent || 0;

    return {
      services: servicesMap,
      system: {
        cpu: {
          usage: data.cpu?.usage_percent
            ? `${data.cpu.usage_percent.toFixed(1)}%`
            : avgCpuPercent !== null
              ? `${avgCpuPercent.toFixed(1)}%`
              : "N/A",
          cores: data.cpu?.cores ? `${data.cpu.cores}` : "N/A",
          model: "N/A",
          // ✅ CORRECTION : Exposer load_1, load_5, load_15 pour la charge (load average, pas pourcentage)
          load_1: data.cpu?.load_1,
          load_5: data.cpu?.load_5,
          load_15: data.cpu?.load_15,
          // ✅ CORRECTION : Exposer usage_percent comme nombre pour les comparaisons (pourcentage CPU système)
          usage_percent:
            data.cpu?.usage_percent ||
            (data.cpu?.load_1 ? data.cpu.load_1 : undefined),
          // ✅ CORRECTION : Exposer les métriques CPU des conteneurs
          containers_only: avgCpuPercentContainers,
          per_core:
            data.cpu?.cores && data.cpu.cores > 0
              ? avgCpuPercentContainers / data.cpu.cores
              : avgCpuPercentContainers,
        },
        memory: {
          total: data.memory?.total_mb
            ? `${(data.memory.total_mb / 1024).toFixed(2)} GB`
            : "N/A",
          used: data.memory?.used_mb
            ? `${(data.memory.used_mb / 1024).toFixed(2)} GB`
            : "N/A",
          free: data.memory?.free_mb
            ? `${(data.memory.free_mb / 1024).toFixed(2)} GB`
            : "N/A",
          usage: data.memory?.usage_percent
            ? `${data.memory.usage_percent.toFixed(1)}%`
            : avgMemoryPercent !== null
              ? `${avgMemoryPercent.toFixed(1)}%`
              : "N/A",
          // ✅ CORRECTION : Exposer used_mb et total_mb pour l'affichage
          used_mb: data.memory?.used_mb,
          total_mb: data.memory?.total_mb,
          // ✅ CORRECTION : Exposer usage_percent comme nombre pour les comparaisons
          usage_percent: data.memory?.usage_percent,
        },
        load: {
          average: data.cpu?.load_1 ? `${data.cpu.load_1.toFixed(2)}` : "N/A",
          cores: data.cpu?.cores ? `${data.cpu.cores}` : "N/A",
          load_1: data.cpu?.load_1,
          load_5: data.cpu?.load_5,
          load_15: data.cpu?.load_15,
        },
        disk: data.disk
          ? [
              {
                name: "root",
                total: `${data.disk.total_gb.toFixed(2)} GB`,
                used: `${data.disk.used_gb.toFixed(2)} GB`,
                free: `${data.disk.free_gb.toFixed(2)} GB`,
                usage: `${data.disk.usage_percent.toFixed(1)}%`,
                // ✅ CORRECTION : Exposer usage_percent comme nombre pour les comparaisons
                usage_percent_number: data.disk.usage_percent,
              },
            ]
          : [],
        // ✅ CORRECTION : Ajouter la structure jobbingtrack avec les conteneurs
        jobbingtrack: {
          containers: {
            count: jobbingtrackContainers.length || data.container_count || 0,
            cpu: {
              totalPercent: totalCpuPercent,
              averagePercent: projectCpuAvg || 0, // ✅ Utiliser project_cpu_avg directement (avec fallback à 0)
            },
            memory: {
              used: projectMemoryMb, // ✅ Utiliser project_memory_mb directement
              limit: totalMemoryLimitMb,
              percent: avgMemoryPercentContainers, // Pourcentage par rapport à la limite des conteneurs
              percent_of_system: memoryProjectPercent, // ✅ NOUVEAU : Pourcentage par rapport à la mémoire système totale
            },
          },
          disk: data.disk
            ? [
                {
                  usage_percent: `${data.disk.usage_percent.toFixed(1)}%`,
                  used_human: `${data.disk.used_gb.toFixed(2)} GB`,
                  total_human: `${data.disk.total_gb.toFixed(2)} GB`,
                },
              ]
            : [],
        },
      },
      // ✅ CORRECTION : Exposer monitoringC pour que le frontend puisse l'utiliser
      monitoringC: {
        avg_cpu_percent: avgCpuPercent,
        avg_memory_percent: avgMemoryPercent,
        avg_response_time_ms: avgResponseTimeMs, // ✅ CORRECTION : Utiliser avgResponseTimeMs calculé
        container_count: data.container_count,
        load_score: data.load_score,
        availability_percent: data.availability_percent,
        error_rate_per_min:
          typeof data.error_rate_per_min === "number"
            ? data.error_rate_per_min
            : 0, // ✅ NOUVEAU : Exposer error_rate_per_min
        services_errors:
          typeof data.services?.errors === "number" ? data.services.errors : 0, // ✅ NOUVEAU : Exposer services_errors
      },
      containers: containersMap,
      timestamp,
      // ✅ CORRECTION : Exposer avg_cpu_percent et avg_memory_percent directement pour le frontend
      avg_cpu_percent: avgCpuPercent,
      avg_memory_percent: avgMemoryPercent,
      network: {
        total_rx_mb: totalNetworkRxMb,
        total_tx_mb: totalNetworkTxMb,
        per_service: servicesList.map((s) => ({
          name: s.rawName || s.name,
          rx_mb: s.networkMb?.rx ?? 0,
          tx_mb: s.networkMb?.tx ?? 0,
        })),
      },
      responseTime: {
        average_ms: avgResponseTimeMs,
        fastest_ms:
          numericResponseTimes.length > 0
            ? Math.min(...numericResponseTimes)
            : null,
        slowest_ms:
          numericResponseTimes.length > 0
            ? Math.max(...numericResponseTimes)
            : null,
        per_service: servicesList.map((s) => ({
          name: s.rawName || s.name,
          status: s.status,
          response_time_ms: s.responseTimeMs,
        })),
      },
      errors: {
        total_last_5m: 0,
        rate_per_min: 0,
        per_service: servicesList.map((s) => ({
          name: s.rawName || s.name,
          count_last_5m: 0,
          rate_per_min: 0,
        })),
      },
      health: {
        availability_percent: availabilityPercent,
        per_service: servicesList.map((s) => ({
          name: s.rawName || s.name,
          status: s.status,
          last_check: timestamp,
        })),
      },
      overallLoadScore: loadScore,
      servicesList: servicesList, // ✅ IMPORTANT : Inclure servicesList pour analytics
    };
  }

  /**
   * Récupère l'historique des métriques depuis PostgreSQL via metrics-aggregator
   */
  async getMetricsHistory(options?: {
    limit?: number;
    startTime?: number;
    endTime?: number;
  }) {
    try {
      const limit = options?.limit || 500;
      const startTime = options?.startTime
        ? new Date(options.startTime).toISOString()
        : undefined;
      const endTime = options?.endTime
        ? new Date(options.endTime).toISOString()
        : undefined;

      // Même chemin que analytics : proxy Next `/api/metrics-aggregator` + X-API-Key serveur
      const rows = await analyticsService.getSystemMetricsHistory({
        limit,
        startDate: startTime,
        endDate: endTime,
      });

      if (!Array.isArray(rows) || rows.length === 0) return [];

      // Formater les données pour correspondre au format attendu par les graphiques
      // Le format Prisma SystemMetricsSnapshot utilise des noms de champs différents
      return rows.map((item: any) => {
        // ✅ CORRECTION : Mapper depuis le format Prisma SystemMetricsSnapshot
        // Prisma utilise : cpuUsagePercent, memoryUsagePercent, networkRxBytes, etc.
        // On doit aussi vérifier le format depuis system_metrics (PostgreSQL direct) qui utilise : cpu_usage_percent, etc.
        const cpuPercent =
          item.cpuUsagePercent !== undefined
            ? item.cpuUsagePercent
            : item.cpu_usage_percent !== undefined
              ? item.cpu_usage_percent
              : 0;
        const memoryPercent =
          item.memoryUsagePercent !== undefined
            ? item.memoryUsagePercent
            : item.memory_usage_percent !== undefined
              ? item.memory_usage_percent
              : 0;

        // Calculer les métriques réseau depuis les conteneurs si nécessaire
        const networkRxBytes =
          item.networkRxBytes !== undefined
            ? item.networkRxBytes
            : item.total_network_rx_bytes !== undefined
              ? item.total_network_rx_bytes
              : 0;
        const networkTxBytes =
          item.networkTxBytes !== undefined
            ? item.networkTxBytes
            : item.total_network_tx_bytes !== undefined
              ? item.total_network_tx_bytes
              : 0;
        const networkRxMb = networkRxBytes
          ? Number(networkRxBytes) / (1024 * 1024)
          : 0;
        const networkTxMb = networkTxBytes
          ? Number(networkTxBytes) / (1024 * 1024)
          : 0;

        // ISO UTC canonique (même règles que graphiques analytics : naïf PostgreSQL = UTC, pas heure locale du parseur)
        const rawTs = item.timestamp;
        let timestamp = new Date().toISOString();
        if (rawTs != null && rawTs !== "") {
          const iso = normalizeMetricTimestampToIso(rawTs);
          if (iso) {
            const d = new Date(iso);
            if (!Number.isNaN(d.getTime())) timestamp = d.toISOString();
            else
              console.warn(
                "[CENTRAL METRICS] ⚠️ Timestamp invalide après normalisation:",
                rawTs,
              );
          }
        }

        // ✅ NOUVEAU : Inclure memory_total_mb pour le calcul de project_memory_percent
        const memoryTotalMb =
          item.memoryTotalMb !== undefined
            ? item.memoryTotalMb
            : item.memory_total_mb !== undefined
              ? item.memory_total_mb
              : item.total_memory_mb !== undefined
                ? item.total_memory_mb
                : null;

        return {
          timestamp: timestamp,
          cpu_percent: cpuPercent,
          memory_percent: memoryPercent,
          memory_total_mb: memoryTotalMb, // ✅ NOUVEAU : Inclure pour calculer project_memory_percent
          network_rx_mb: networkRxMb,
          network_tx_mb: networkTxMb,
          response_time_avg:
            item.responseTimeAvg !== undefined
              ? item.responseTimeAvg
              : item.avg_response_time_ms !== undefined
                ? item.avg_response_time_ms
                : 0,
          error_count:
            item.errorCount !== undefined
              ? item.errorCount
              : item.error_count !== undefined
                ? item.error_count
                : 0,
          error_rate: (() => {
            const explicit =
              item.errorRate !== undefined ? item.errorRate : item.error_rate;
            if (explicit != null && Number.isFinite(Number(explicit))) {
              return Number(explicit);
            }
            const avail = item.availabilityPercent ?? item.availability_percent;
            if (avail != null && Number.isFinite(Number(avail))) {
              return Math.max(0, Math.min(100, 100 - Number(avail)));
            }
            const load = item.loadScore ?? item.load_score;
            if (load != null && Number.isFinite(Number(load))) {
              return Math.max(0, Math.min(100, 100 - Number(load)));
            }
            return 0;
          })(),
          error_rate_derived: !(
            item.errorRate != null || item.error_rate != null
          ),
          availability_percent:
            item.availabilityPercent !== undefined
              ? item.availabilityPercent
              : item.availability_percent !== undefined
                ? item.availability_percent
                : 100,
          load_score:
            item.loadScore !== undefined
              ? item.loadScore
              : item.load_score !== undefined
                ? item.load_score
                : 0,
          // ✅ CORRECTION : Inclure project_cpu_avg et project_memory_mb si disponibles
          // ✅ DEBUG : Vérifier plusieurs formats possibles
          project_cpu_avg:
            item.project_cpu_avg !== undefined && item.project_cpu_avg !== null
              ? Number(item.project_cpu_avg)
              : item.projectCpuAvg !== undefined && item.projectCpuAvg !== null
                ? Number(item.projectCpuAvg)
                : undefined,
          project_memory_mb:
            item.project_memory_mb !== undefined &&
            item.project_memory_mb !== null
              ? Number(item.project_memory_mb)
              : item.projectMemoryMb !== undefined &&
                  item.projectMemoryMb !== null
                ? Number(item.projectMemoryMb)
                : undefined,
          // Inclure les métriques de services si l'API les expose, sinon les conteneurs.
          services: item.services || item.containers || [],
        };
      });
    } catch (error: any) {
      console.warn(
        "[CENTRAL METRICS] ⚠️ Erreur récupération historique:",
        error.message,
      );
      return [];
    }
  }

  /**
   * Récupère les statistiques sur une période
   */
  async getMetricsStats(options?: {
    startTime?: number;
    endTime?: number;
  }): Promise<Record<string, unknown> | null> {
    // Stats sur période : à implémenter côté metrics-aggregator si besoin
    return null;
  }
}

export const centralMetricsService = new CentralMetricsService();
export type {
  SystemMetrics,
  ServiceMetrics,
  ContainerMetrics,
  MetricsData,
  UserCustomization,
};
