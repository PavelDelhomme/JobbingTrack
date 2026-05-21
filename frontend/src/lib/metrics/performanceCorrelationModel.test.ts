import {
  buildIncidentEmptyReason,
  buildLiveEndpointModel,
  formatIncidentTableCell,
  parseLiveResponseTimeMs,
} from "./performanceCorrelationModel";
import type { MetricsData } from "@/lib/interfaces";

describe("performanceCorrelationModel", () => {
  it("affiche un tiret dans le tableau au lieu de répéter le diagnostic technique", () => {
    expect(formatIncidentTableCell(null)).toBe("—");
    expect(formatIncidentTableCell("")).toBe("—");
    expect(formatIncidentTableCell("source absente")).toBe("—");
    expect(
      formatIncidentTableCell("source absente | champ manquant (métriques)"),
    ).toBe("—");
    expect(formatIncidentTableCell("/api/v1/security/alerts")).toBe(
      "/api/v1/security/alerts",
    );
  });

  it("conserve la raison de diagnostic pour une ligne sans contexte ni métriques", () => {
    expect(
      buildIncidentEmptyReason({
        requestId: null,
        endpoint: null,
        ip: null,
        protocol: null,
        port: null,
        httpStatus: null,
        nearestCpu: null,
        nearestMemory: null,
        nearestRtMs: null,
        deltaSec: null,
      }),
    ).toBe("source absente | hors fenêtre");
  });

  it("parse les temps de réponse numériques ou libellés en ms", () => {
    expect(parseLiveResponseTimeMs(42.5)).toBe(42.5);
    expect(parseLiveResponseTimeMs("123 ms")).toBe(123);
    expect(parseLiveResponseTimeMs("N/A")).toBeNull();
    expect(parseLiveResponseTimeMs(0)).toBeNull();
  });

  it("utilise responseTime.per_service comme fallback pour les services sans mesure directe", () => {
    const model = buildLiveEndpointModel({
      services: {},
      servicesList: [
        {
          rawName: "jobbingtrack-auth-service",
          name: "Auth Service",
          displayName: "Auth Service",
          url: "",
          port: 3001,
          status: "running",
          responseTime: "N/A",
          responseTimeMs: null,
          health: { status: "online", responseTime: "N/A" },
          lastCheck: "2026-05-21T00:00:00.000Z",
        },
        {
          rawName: "jobbingtrack-company-service",
          name: "Company Service",
          displayName: "Company Service",
          url: "",
          port: 3002,
          status: "running",
          responseTime: "N/A",
          responseTimeMs: null,
          health: { status: "online", responseTime: "N/A" },
          lastCheck: "2026-05-21T00:00:00.000Z",
        },
      ],
      system: {},
      containers: {},
      timestamp: "2026-05-21T00:00:00.000Z",
      responseTime: {
        average_ms: 88,
        per_service: [
          {
            name: "jobbingtrack-auth-service",
            status: "running",
            response_time_ms: 42,
          },
        ],
      },
    } as MetricsData);

    expect(model.overviewMs).toBe(88);
    expect(model.bars).toEqual([
      { name: "Auth Service", ms: 42, status: "running" },
    ]);
    expect(model.noMeasure).toEqual(["Company Service"]);
  });

  it("ajoute les services présents uniquement dans responseTime.per_service", () => {
    const model = buildLiveEndpointModel({
      services: {},
      system: {},
      containers: {},
      timestamp: "2026-05-21T00:00:00.000Z",
      responseTime: {
        per_service: [
          {
            name: "jobbingtrack-security-service",
            status: "running",
            response_time_ms: "64 ms",
          },
        ],
      },
    } as MetricsData);

    expect(model.bars).toEqual([
      {
        name: "jobbingtrack-security-service",
        ms: 64,
        status: "running",
      },
    ]);
    expect(model.noMeasure).toEqual([]);
  });
});
