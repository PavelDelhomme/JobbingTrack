/**
 * Configuration centralisée des ports pour le frontend
 * Les valeurs sont récupérées depuis les variables d'environnement
 * avec des valeurs par défaut si non définies
 */

function envPort(key: string, fallback: string): number {
  const raw = process.env[key];
  if (typeof raw !== "string" || !/^\d+$/.test(raw.trim())) {
    return parseInt(fallback, 10);
  }
  return parseInt(raw.trim(), 10);
}

function envPublicUrl(key: string): string | undefined {
  const raw = process.env[key];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// Ports externes (exposés sur l'hôte)
export const EXTERNAL_PORTS = {
  FRONTEND: envPort("NEXT_PUBLIC_FRONTEND_PORT", "5003"),
  API_GATEWAY: envPort("NEXT_PUBLIC_API_GATEWAY_PORT", "5002"),
  AUTH_SERVICE: envPort("NEXT_PUBLIC_AUTH_SERVICE_PORT", "8001"),
  APPLICATION_SERVICE: envPort("NEXT_PUBLIC_APPLICATION_SERVICE_PORT", "8002"),
  COMPANY_SERVICE: envPort("NEXT_PUBLIC_COMPANY_SERVICE_PORT", "8003"),
  CONTACT_SERVICE: envPort("NEXT_PUBLIC_CONTACT_SERVICE_PORT", "8004"),
  INTERVIEW_SERVICE: envPort("NEXT_PUBLIC_INTERVIEW_SERVICE_PORT", "8005"),
  CALL_SERVICE: envPort("NEXT_PUBLIC_CALL_SERVICE_PORT", "8006"),
  EVENT_SERVICE: envPort("NEXT_PUBLIC_EVENT_SERVICE_PORT", "8007"),
  FOLLOWUP_SERVICE: envPort("NEXT_PUBLIC_FOLLOWUP_SERVICE_PORT", "8008"),
  METRICS_AGGREGATOR: envPort("NEXT_PUBLIC_METRICS_AGGREGATOR_PORT", "5004"),
  DASHBOARD_SERVICE: envPort("NEXT_PUBLIC_DASHBOARD_SERVICE_PORT", "8012"),
  POSTGRES: envPort("NEXT_PUBLIC_POSTGRES_PORT", "5432"),
  REDIS: envPort("NEXT_PUBLIC_REDIS_PORT", "6379"),
} as const;

const getProtocol = () => {
  if (typeof window !== "undefined") {
    return window.location.protocol.replace(":", "");
  }
  return process.env.NEXT_PUBLIC_PROTOCOL || "http";
};

const getHost = () => {
  if (typeof window !== "undefined") {
    return window.location.hostname;
  }
  return process.env.NEXT_PUBLIC_HOST || "localhost";
};

/** Port HTTPS dev (Nginx) — aligné avec `DEV_HTTPS_PORT` / `.env.example`. */
function devHttpsPort(): string {
  const raw =
    process.env.NEXT_PUBLIC_DEV_HTTPS_PORT ||
    process.env.DEV_HTTPS_PORT ||
    "5443";
  return /^\d+$/.test(String(raw).trim()) ? String(raw).trim() : "5443";
}

/** API gateway derrière Nginx TLS (`api.jobbingtrack.localhost`). */
function devHttpsApiOrigin(browserPort?: string): string {
  const configured = devHttpsPort();
  const effectivePort =
    browserPort === "" || browserPort === "443"
      ? "443"
      : browserPort && /^\d+$/.test(browserPort)
        ? browserPort
        : configured;
  if (effectivePort === "443") {
    return "https://api.jobbingtrack.localhost";
  }
  return `https://api.jobbingtrack.localhost:${effectivePort}`;
}

function isPrivateLanHostname(hostname: string): boolean {
  return (
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)
  );
}

/** Origine navigateur → API same-origin via Nginx dev (`/api/*` → gateway). */
function devHttpsSameOrigin(
  hostname: string,
  port: string,
  protocol: string,
): string {
  const portSuffix =
    port && port !== "443" && port !== "" ? `:${port}` : "";
  return `${protocol}//${hostname}${portSuffix}`;
}

function shouldUseDevHttpsSameOriginApi(
  protocol: string,
  hostname: string,
  port: string,
): boolean {
  if (process.env.NODE_ENV === "production" || protocol !== "https:") {
    return false;
  }
  const httpsDevPort = devHttpsPort();
  const isJobbingtrackHost =
    hostname === "jobbingtrack.localhost" ||
    hostname.endsWith(".jobbingtrack.localhost");
  if (
    isJobbingtrackHost &&
    (port === httpsDevPort || port === "443" || port === "")
  ) {
    return true;
  }
  // LAN mobile : pas de résolution `api.jobbingtrack.localhost`.
  return port === httpsDevPort && isPrivateLanHostname(hostname);
}

const getApiUrl = () => {
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    const httpsDevPort = devHttpsPort();

    // Dev HTTPS : API sur la même origine Nginx (évite CORS api.* et port 443).
    if (shouldUseDevHttpsSameOriginApi(protocol, hostname, port)) {
      return devHttpsSameOrigin(hostname, port, protocol);
    }

    // Autres pages HTTPS (sous-domaine api.* explicite, ports atypiques).
    if (
      protocol === "https:" &&
      (port === httpsDevPort ||
        port === "443" ||
        (port === "" &&
          (hostname === "jobbingtrack.localhost" ||
            hostname.endsWith(".jobbingtrack.localhost"))) ||
        ((hostname === "jobbingtrack.localhost" ||
          hostname.endsWith(".jobbingtrack.localhost")) &&
          port !== String(EXTERNAL_PORTS.API_GATEWAY)))
    ) {
      return devHttpsApiOrigin(port);
    }

    // Ne jamais parler TLS au port gateway HTTP (5002) — provoque ERR_SSL_PROTOCOL_ERROR
    if (protocol === "https:" && port === String(EXTERNAL_PORTS.API_GATEWAY)) {
      return devHttpsApiOrigin(port);
    }

    if (protocol === "http:") {
      return `http://${hostname}:${EXTERNAL_PORTS.API_GATEWAY}`;
    }
  }

  const fromEnv =
    envPublicUrl("NEXT_PUBLIC_API_URL") ||
    envPublicUrl("NEXT_PUBLIC_API_GATEWAY_URL");
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // SSR / premier paint : défaut documenté (.env.example / docker-compose)
  return devHttpsApiOrigin(devHttpsPort());
};

/** URLs résolues à l’usage (évite une inlining Turbopack incorrecte au chargement du module). */
export const FRONTEND_URLS = {
  get base() {
    return `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.FRONTEND}`;
  },
  get api() {
    return getApiUrl();
  },
  get metrics() {
    return (
      envPublicUrl("NEXT_PUBLIC_METRICS_URL") ||
      `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.METRICS_AGGREGATOR}`
    );
  },
  get auth() {
    return (
      envPublicUrl("NEXT_PUBLIC_AUTH_SERVICE_URL") ||
      `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.AUTH_SERVICE}`
    );
  },
} as const;

export const SERVICE_URLS = {
  get apiGateway() {
    return FRONTEND_URLS.api;
  },
  get auth() {
    return `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.AUTH_SERVICE}`;
  },
  get application() {
    return `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.APPLICATION_SERVICE}`;
  },
  get company() {
    return `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.COMPANY_SERVICE}`;
  },
  get contact() {
    return `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.CONTACT_SERVICE}`;
  },
  get interview() {
    return `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.INTERVIEW_SERVICE}`;
  },
  get call() {
    return `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.CALL_SERVICE}`;
  },
  get event() {
    return `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.EVENT_SERVICE}`;
  },
  get followup() {
    return `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.FOLLOWUP_SERVICE}`;
  },
  get metrics() {
    return FRONTEND_URLS.metrics;
  },
  get dashboard() {
    return `${getProtocol()}://${getHost()}:${EXTERNAL_PORTS.DASHBOARD_SERVICE}`;
  },
} as const;

export function getServiceUrl(serviceName: keyof typeof SERVICE_URLS): string {
  return SERVICE_URLS[serviceName] || FRONTEND_URLS.api;
}

export function getServicePort(
  serviceName: keyof typeof EXTERNAL_PORTS,
): number {
  return EXTERNAL_PORTS[serviceName] || EXTERNAL_PORTS.API_GATEWAY;
}
