/**
 * SDK de tracking des actions utilisateur
 * Collecte automatique des événements, erreurs et métriques de performance
 */

import { FRONTEND_URLS } from "@/config/ports.config";

interface DeviceInfo {
  deviceId: string;
  platform: "web" | "ios" | "android";
  deviceModel?: string;
  osName?: string;
  osVersion?: string;
  browserName?: string;
  browserVersion?: string;
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
  timezone?: string;
}

interface SessionInfo {
  sessionId: string;
  startTime: Date;
  pageViews: number;
  actions: number;
  errors: number;
}

interface EventProperties {
  elementId?: string;
  elementType?: string;
  elementText?: string;
  page?: string;
  [key: string]: any;
}

class UserTracking {
  private static instance: UserTracking;
  private sessionId: string | null = null;
  private deviceId: string | null = null;
  private deviceInfo: DeviceInfo | null = null;
  private sessionInfo: SessionInfo | null = null;
  private apiUrl: string;
  private enabled: boolean = true;
  private eventQueue: any[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private blockedByClient: boolean = false;
  private consecutiveFailures: number = 0;
  private maxConsecutiveFailures: number = 3;

  private constructor() {
    this.apiUrl = FRONTEND_URLS.api;
    this.init();
  }

  public static getInstance(): UserTracking {
    if (!UserTracking.instance) {
      UserTracking.instance = new UserTracking();
    }
    return UserTracking.instance;
  }

  /**
   * Vérifier si on est sur une plateforme mobile
   */
  private isMobilePlatform(): boolean {
    if (typeof window === "undefined") return false;

    // Vérifier via user agent
    const userAgent =
      navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobile =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase(),
      );

    // Vérifier via la largeur d'écran (optionnel)
    const isSmallScreen = window.innerWidth <= 768;

    // Vérifier si on est dans le backoffice (ne pas tracker)
    const isBackoffice = window.location.pathname.startsWith("/backoffice");

    // Le tracking est uniquement pour mobile ET pas dans le backoffice
    return isMobile && !isBackoffice;
  }

  /**
   * Initialiser le tracking
   */
  private async init() {
    if (typeof window === "undefined") return;

    // ✅ DÉSACTIVER le tracking pour le web/backoffice - uniquement pour mobile
    if (!this.isMobilePlatform()) {
      this.enabled = false;
      return;
    }

    // Vérifier si le tracking est désactivé manuellement
    const trackingDisabled =
      localStorage.getItem("tracking_disabled") === "true";
    if (trackingDisabled) {
      this.enabled = false;
      return;
    }

    // Générer ou récupérer deviceId
    this.deviceId = this.getOrCreateDeviceId();

    // Collecter les informations de l'appareil
    this.deviceInfo = this.collectDeviceInfo();

    // Enregistrer l'appareil
    await this.registerDevice();

    // Démarrer une nouvelle session
    await this.startSession();

    // Démarrer le flush périodique seulement si le tracking n'est pas désactivé
    // Vérifier aussi si le tracking n'a pas été bloqué précédemment
    if (this.enabled && !this.blockedByClient) {
      // Vérifier localStorage pour voir si le tracking a été bloqué précédemment
      const wasBlocked =
        typeof window !== "undefined" &&
        localStorage.getItem("tracking_blocked") === "true";
      if (!wasBlocked) {
        this.startFlushInterval();
      } else {
        this.blockedByClient = true;
        this.enabled = false;
      }
    }

    // Écouter les erreurs JavaScript
    this.setupErrorTracking();

    // Écouter la navigation
    this.setupNavigationTracking();

    // Écouter la fermeture de la page
    this.setupPageUnload();
  }

  /**
   * Obtenir ou créer un deviceId
   */
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem("device_id");
    if (!deviceId) {
      deviceId = this.generateId();
      localStorage.setItem("device_id", deviceId);
    }
    return deviceId;
  }

  /**
   * Générer un ID unique
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Collecter les informations de l'appareil
   */
  private collectDeviceInfo(): DeviceInfo {
    const ua = navigator.userAgent;
    const screen = window.screen;

    // Détecter le navigateur
    let browserName = "Unknown";
    let browserVersion = "Unknown";
    if (ua.includes("Chrome")) {
      browserName = "Chrome";
      const match = ua.match(/Chrome\/(\d+)/);
      browserVersion = match ? match[1] : "Unknown";
    } else if (ua.includes("Firefox")) {
      browserName = "Firefox";
      const match = ua.match(/Firefox\/(\d+)/);
      browserVersion = match ? match[1] : "Unknown";
    } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
      browserName = "Safari";
      const match = ua.match(/Version\/(\d+)/);
      browserVersion = match ? match[1] : "Unknown";
    } else if (ua.includes("Edge")) {
      browserName = "Edge";
      const match = ua.match(/Edge\/(\d+)/);
      browserVersion = match ? match[1] : "Unknown";
    }

    // Détecter l'OS
    let osName = "Unknown";
    let osVersion = "Unknown";
    if (ua.includes("Windows")) {
      osName = "Windows";
      const match = ua.match(/Windows NT (\d+\.\d+)/);
      osVersion = match ? match[1] : "Unknown";
    } else if (ua.includes("Mac OS X")) {
      osName = "macOS";
      const match = ua.match(/Mac OS X (\d+[._]\d+)/);
      osVersion = match ? match[1].replace("_", ".") : "Unknown";
    } else if (ua.includes("Linux")) {
      osName = "Linux";
    } else if (ua.includes("Android")) {
      osName = "Android";
      const match = ua.match(/Android (\d+\.\d+)/);
      osVersion = match ? match[1] : "Unknown";
    } else if (ua.includes("iPhone") || ua.includes("iPad")) {
      osName = "iOS";
      const match = ua.match(/OS (\d+[._]\d+)/);
      osVersion = match ? match[1].replace("_", ".") : "Unknown";
    }

    return {
      deviceId: this.deviceId!,
      platform: "web",
      osName,
      osVersion,
      browserName,
      browserVersion,
      screenWidth: screen.width,
      screenHeight: screen.height,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  /**
   * Enregistrer l'appareil
   */
  private async registerDevice() {
    if (!this.deviceInfo) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${this.apiUrl}/api/v1/analytics/device`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(this.deviceInfo),
      });

      // Si la requête échoue, détecter si c'est un blocage
      if (!response.ok) {
        this.consecutiveFailures++;
      }
    } catch (error: any) {
      const isBlockedByClient =
        error.message?.includes("ERR_BLOCKED_BY_CLIENT") ||
        error.message?.includes("Failed to fetch");
      if (isBlockedByClient) {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          this.blockedByClient = true;
          this.enabled = false;
        }
      }
      // Ne pas logger pour éviter de spammer la console
    }
  }

  /**
   * Démarrer une nouvelle session
   */
  private async startSession() {
    if (!this.deviceInfo) return;

    this.sessionId = this.generateId();
    const startTime = new Date();

    // Toujours créer la session info même si l'envoi échoue
    this.sessionInfo = {
      sessionId: this.sessionId,
      startTime,
      pageViews: 0,
      actions: 0,
      errors: 0,
    };

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${this.apiUrl}/api/v1/analytics/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          ...this.deviceInfo,
          sessionId: this.sessionId,
          deviceId: this.deviceId,
          platform: this.deviceInfo.platform,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        this.consecutiveFailures++;
      }
    } catch (error: any) {
      const isBlockedByClient =
        error.message?.includes("ERR_BLOCKED_BY_CLIENT") ||
        error.message?.includes("Failed to fetch");
      if (isBlockedByClient) {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          this.blockedByClient = true;
          this.enabled = false;
        }
      }
      // Ne pas logger pour éviter de spammer la console
    }
  }

  /**
   * Terminer la session
   */
  public async endSession() {
    if (!this.sessionId || !this.sessionInfo || this.blockedByClient) return;

    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - this.sessionInfo.startTime.getTime()) / 1000,
    );

    try {
      const token = localStorage.getItem("token");
      await fetch(
        `${this.apiUrl}/api/v1/analytics/sessions/${this.sessionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            endTime: endTime.toISOString(),
            duration,
            pageViews: this.sessionInfo.pageViews,
            actions: this.sessionInfo.actions,
            errors: this.sessionInfo.errors,
          }),
        },
      );
    } catch (error) {
      // Ne pas logger pour éviter de spammer la console
    }
  }

  /**
   * Tracker un événement
   */
  public trackEvent(
    eventName: string,
    eventType: string = "click",
    category?: string,
    properties?: EventProperties,
  ) {
    // Vérifier IMMÉDIATEMENT si bloqué ou désactivé
    if (this.blockedByClient || !this.enabled || !this.sessionId) {
      return;
    }

    const event = {
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      eventType,
      eventName,
      category,
      page: window.location.pathname,
      properties: {
        ...properties,
        url: window.location.href,
        referrer: document.referrer,
      },
      platform: "web",
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    };

    this.eventQueue.push(event);
    if (this.sessionInfo) {
      this.sessionInfo.actions++;
    }

    // Flush immédiat si la queue est pleine
    if (this.eventQueue.length >= 10) {
      this.flushEvents();
    }
  }

  /**
   * Tracker un clic sur un élément
   */
  public trackClick(element: HTMLElement, eventName?: string) {
    const elementId =
      element.id || element.getAttribute("data-id") || undefined;
    const elementType = element.tagName.toLowerCase();
    const elementText = element.textContent?.trim().substring(0, 100);

    this.trackEvent(eventName || `click_${elementType}`, "click", "ui", {
      elementId,
      elementType,
      elementText,
    });
  }

  /**
   * Tracker une vue de page
   */
  public trackPageView(page?: string) {
    if (!this.enabled || !this.sessionId || this.blockedByClient) return;

    if (this.sessionInfo) {
      this.sessionInfo.pageViews++;
    }

    this.trackEvent("page_view", "navigation", "navigation", {
      page: page || window.location.pathname,
    });
  }

  /**
   * Tracker une erreur
   */
  public trackError(
    error: Error | string,
    errorType: string = "javascript",
    severity: "error" | "warning" | "critical" = "error",
    properties?: Record<string, any>,
  ) {
    // Vérifier IMMÉDIATEMENT si bloqué ou désactivé
    if (this.blockedByClient || !this.enabled) {
      return;
    }

    const errorMessage = typeof error === "string" ? error : error.message;
    const stackTrace = error instanceof Error ? error.stack : undefined;

    if (this.sessionInfo) {
      this.sessionInfo.errors++;
    }

    this.sendError({
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      errorType,
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: errorMessage.substring(0, 1000),
      stackTrace: stackTrace?.substring(0, 5000),
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      platform: "web",
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
      severity,
      properties,
    });
  }

  /**
   * Tracker une métrique de performance
   */
  public trackPerformance(
    metricName: string,
    metricType: string,
    value?: number,
    duration?: number,
    additionalData?: Record<string, any>,
  ) {
    // Vérifier IMMÉDIATEMENT si bloqué ou désactivé
    if (this.blockedByClient || !this.enabled || !this.sessionId) {
      return;
    }

    this.sendPerformance({
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      metricType,
      metricName,
      value,
      duration,
      page: window.location.pathname,
      platform: "web",
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
      ...additionalData,
    });
  }

  /**
   * Envoyer un événement
   */
  private async sendEvent(event: any) {
    // Si le tracking est bloqué, ne pas essayer
    if (this.blockedByClient || !this.enabled) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${this.apiUrl}/api/v1/analytics/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(event),
      });

      // Si la requête réussit, réinitialiser le compteur d'échecs
      if (response.ok) {
        this.consecutiveFailures = 0;
        this.blockedByClient = false;
      } else {
        this.consecutiveFailures++;
      }
    } catch (error: any) {
      // Détecter si c'est une erreur de blocage par le client (bloqueur de pub)
      const isBlockedByClient =
        error.message?.includes("ERR_BLOCKED_BY_CLIENT") ||
        error.message?.includes("Failed to fetch") ||
        (error.name === "TypeError" && error.message?.includes("fetch"));

      if (isBlockedByClient) {
        // Désactiver IMMÉDIATEMENT dès la première détection
        this.blockedByClient = true;
        this.enabled = false;
        this.consecutiveFailures = this.maxConsecutiveFailures; // Marquer comme complètement bloqué

        // Sauvegarder dans localStorage pour éviter de réessayer au prochain chargement
        if (typeof window !== "undefined") {
          localStorage.setItem("tracking_blocked", "true");
        }

        // Nettoyer la queue pour éviter d'accumuler des événements
        this.eventQueue = [];

        // Arrêter le flush interval IMMÉDIATEMENT
        if (this.flushInterval) {
          clearInterval(this.flushInterval);
          this.flushInterval = null;
        }

        // Désactiver définitivement - ne plus jamais essayer
        // Ne pas logger pour éviter de spammer la console
        return;
      } else {
        // Pour les autres erreurs, incrémenter le compteur mais continuer
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          // Désactiver temporairement après trop d'échecs
          this.enabled = false;
          // Réactiver après 5 minutes
          setTimeout(
            () => {
              this.enabled = true;
              this.consecutiveFailures = 0;
            },
            5 * 60 * 1000,
          );
        }
      }

      // Ne jamais logger les erreurs de tracking pour éviter de spammer la console
      // Les erreurs ERR_BLOCKED_BY_CLIENT sont normales avec les bloqueurs de pub
    }
  }

  /**
   * Envoyer une erreur
   */
  private async sendError(error: any) {
    // Si le tracking est bloqué, ne pas essayer
    if (this.blockedByClient || !this.enabled) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await fetch(`${this.apiUrl}/api/v1/analytics/errors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(error),
      });
    } catch (error: any) {
      // Ne pas logger les erreurs de tracking pour éviter de spammer la console
      // Seulement détecter si c'est un blocage
      const isBlockedByClient =
        error.message?.includes("ERR_BLOCKED_BY_CLIENT") ||
        error.message?.includes("Failed to fetch");
      if (isBlockedByClient) {
        this.blockedByClient = true;
        this.enabled = false;
      }
    }
  }

  /**
   * Envoyer une métrique de performance
   */
  private async sendPerformance(performance: any) {
    // Si le tracking est bloqué, ne pas essayer
    if (this.blockedByClient || !this.enabled) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await fetch(`${this.apiUrl}/api/v1/analytics/performance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(performance),
      });
    } catch (error: any) {
      // Ne pas logger les erreurs de tracking pour éviter de spammer la console
      // Seulement détecter si c'est un blocage
      const isBlockedByClient =
        error.message?.includes("ERR_BLOCKED_BY_CLIENT") ||
        error.message?.includes("Failed to fetch");
      if (isBlockedByClient) {
        this.blockedByClient = true;
        this.enabled = false;
      }
    }
  }

  /**
   * Flush les événements en queue
   */
  private async flushEvents() {
    // Vérifier IMMÉDIATEMENT si bloqué ou désactivé
    if (this.blockedByClient || !this.enabled) {
      // Nettoyer la queue si bloqué
      if (this.blockedByClient) {
        this.eventQueue = [];
      }
      return;
    }

    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    // Envoyer les événements en batch
    for (const event of events) {
      // Vérifier à nouveau avant chaque envoi
      if (this.blockedByClient || !this.enabled) {
        // Remettre les événements restants dans la queue si on s'arrête
        this.eventQueue = [
          ...events.slice(events.indexOf(event)),
          ...this.eventQueue,
        ];
        return;
      }
      await this.sendEvent(event);
    }
  }

  /**
   * Démarrer le flush périodique
   */
  private startFlushInterval() {
    // Ne pas démarrer si déjà bloqué ou désactivé
    if (this.blockedByClient || !this.enabled) {
      return;
    }

    // Arrêter l'interval précédent s'il existe
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      // Vérifier avant chaque flush
      if (this.blockedByClient || !this.enabled) {
        if (this.flushInterval) {
          clearInterval(this.flushInterval);
          this.flushInterval = null;
        }
        return;
      }
      this.flushEvents();
    }, 5000); // Flush toutes les 5 secondes
  }

  /**
   * Configurer le tracking des erreurs
   */
  private setupErrorTracking() {
    // Erreurs JavaScript globales
    window.addEventListener("error", (event) => {
      // Ne pas tracker si bloqué
      if (this.blockedByClient || !this.enabled) {
        return;
      }
      this.trackError(event.error || event.message, "javascript", "error", {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Promesses rejetées non gérées
    window.addEventListener("unhandledrejection", (event) => {
      // Ne pas tracker si bloqué
      if (this.blockedByClient || !this.enabled) {
        return;
      }
      this.trackError(
        event.reason instanceof Error ? event.reason : String(event.reason),
        "promise",
        "error",
      );
    });
  }

  /**
   * Configurer le tracking de navigation
   */
  private setupNavigationTracking() {
    // Tracker la page initiale
    this.trackPageView();

    // Tracker les changements de route (Next.js)
    if (typeof window !== "undefined") {
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = (...args) => {
        originalPushState.apply(history, args);
        setTimeout(() => this.trackPageView(), 100);
      };

      history.replaceState = (...args) => {
        originalReplaceState.apply(history, args);
        setTimeout(() => this.trackPageView(), 100);
      };

      window.addEventListener("popstate", () => {
        setTimeout(() => this.trackPageView(), 100);
      });
    }
  }

  /**
   * Configurer le tracking à la fermeture de la page
   */
  private setupPageUnload() {
    window.addEventListener("beforeunload", () => {
      // Flush les événements restants
      this.flushEvents();
      // Terminer la session
      this.endSession();
    });

    // Pour les navigateurs qui supportent visibilitychange
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.flushEvents();
      }
    });
  }

  /**
   * Activer/désactiver le tracking
   */
  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem("tracking_disabled", (!enabled).toString());
  }
}

// Export singleton
export const userTracking = UserTracking.getInstance();

// Export pour utilisation directe
export default userTracking;
