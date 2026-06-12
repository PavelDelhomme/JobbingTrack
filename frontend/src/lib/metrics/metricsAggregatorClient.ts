/**
 * Point d’entrée unique pour les URLs client metrics-aggregator.
 * Côté navigateur : proxy Next `/api/metrics-aggregator` (injecte METRICS_API_KEY).
 * Côté serveur Node : URL interne Docker ou hôte local selon l’environnement.
 */
export function getMetricsAggregatorClientBase(): string {
  const forceDirect =
    process.env.NEXT_PUBLIC_METRICS_VIA_FRONTEND === "false" ||
    process.env.NEXT_PUBLIC_METRICS_VIA_FRONTEND === "0";

  if (typeof window !== "undefined" && !forceDirect) {
    return "/api/metrics-aggregator";
  }

  const viaFrontend =
    process.env.NEXT_PUBLIC_METRICS_VIA_FRONTEND === "true" ||
    process.env.NEXT_PUBLIC_METRICS_VIA_FRONTEND === "1";

  if (viaFrontend) {
    if (typeof window !== "undefined") {
      return "/api/metrics-aggregator";
    }
    const internal = process.env.METRICS_AGGREGATOR_INTERNAL_URL?.replace(
      /\/$/,
      "",
    );
    if (internal) {
      return `${internal}/api/v1`;
    }
    const port = process.env.METRICS_AGGREGATOR_INTERNAL_PORT || "3014";
    const host =
      process.env.PROJECT_ROOT === "/app"
        ? `http://jobbingtrack-metrics-aggregator:${port}`
        : `http://127.0.0.1:${process.env.METRICS_AGGREGATOR_PORT || "5004"}`;
    return `${host}/api/v1`;
  }

  const host = (
    process.env.NEXT_PUBLIC_METRICS_AGGREGATOR_URL ||
    process.env.NEXT_PUBLIC_METRICS_URL ||
    (typeof window !== "undefined"
      ? "http://localhost:5004"
      : `http://127.0.0.1:${process.env.METRICS_AGGREGATOR_PORT || "5004"}`)
  ).replace(/\/$/, "");

  if (host.startsWith("/")) {
    return host;
  }
  return `${host}/api/v1`;
}

/** Chemin relatif sans slash initial : ex. `docker/services/all`. */
export function buildMetricsAggregatorUrl(relativePath: string): string {
  const base = getMetricsAggregatorClientBase();
  const path = relativePath.replace(/^\//, "");
  if (base.startsWith("/")) {
    return `${base}/${path}`;
  }
  return `${base}/${path}`;
}
