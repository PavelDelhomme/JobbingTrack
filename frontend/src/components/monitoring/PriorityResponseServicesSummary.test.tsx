"use client";

import { render, screen } from "@testing-library/react";
import { PriorityResponseServicesSummary } from "./PriorityResponseServicesSummary";
import type { StatisticsServiceEntry } from "@/lib/metrics/serviceHealthOverview";

function service(
  name: string,
  overrides: Partial<StatisticsServiceEntry> = {},
): StatisticsServiceEntry {
  return {
    name,
    displayName: name.replace(/^jobbingtrack-/, ""),
    status: "healthy",
    cpu: 0,
    memory: 0,
    responseTime: 10,
    responseTimeLabel: "10ms",
    nonHttpDependency: false,
    errorRate: 0,
    requests: 0,
    availability: 100,
    ...overrides,
  };
}

describe("PriorityResponseServicesSummary", () => {
  it("affiche seulement les services prioritaires P1B dans l'ordre attendu", () => {
    render(
      <PriorityResponseServicesSummary
        services={[
          service("jobbingtrack-company-service"),
          service("jobbingtrack-postgres", {
            displayName: "postgres",
            responseTime: 0,
            responseTimeLabel: "Santé Docker",
            nonHttpDependency: true,
          }),
          service("jobbingtrack-notification-service", {
            displayName: "notification-service",
            responseTimeLabel: "13ms",
          }),
          service("jobbingtrack-auth-service", {
            displayName: "auth-service",
            responseTimeLabel: "7ms",
          }),
        ]}
      />,
    );

    expect(
      screen.getByText("Temps de réponse — services prioritaires P1B"),
    ).toBeInTheDocument();
    expect(screen.getByText("auth-service")).toBeInTheDocument();
    expect(screen.getByText("notification-service")).toBeInTheDocument();
    expect(screen.queryByText("postgres")).not.toBeInTheDocument();
    expect(screen.queryByText("Santé Docker")).not.toBeInTheDocument();
    expect(screen.queryByText("company-service")).not.toBeInTheDocument();

    const rendered = screen
      .getAllByText(/auth-service|notification-service/)
      .map((node) => node.textContent);
    expect(rendered).toEqual(["auth-service", "notification-service"]);
    expect(
      screen.getByRole("link", { name: /détail latence/i }),
    ).toHaveAttribute("href", "/b4ck0ff1ce/performances/latency");
  });

  it("rend un état vide explicite si aucun service prioritaire n'est présent", () => {
    render(
      <PriorityResponseServicesSummary
        services={[service("jobbingtrack-company-service")]}
      />,
    );

    expect(
      screen.getByText(/aucun service prioritaire en cours d'exécution/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute(
      "href",
      "/b4ck0ff1ce/services",
    );
  });
});
