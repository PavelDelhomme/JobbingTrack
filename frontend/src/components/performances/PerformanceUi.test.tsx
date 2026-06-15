"use client";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  PerformanceChartCard,
  PerformanceEmptyState,
  PerformanceInfoNotice,
  PerformanceLoadingState,
  PerformancePageShell,
} from ".";

jest.mock("@/components/features", () => ({
  AdminLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

jest.mock("@/app/(admin)/backoffice/performances/PerformancesSubNav", () => ({
  PerformancesSubNav: () => <nav aria-label="Performances">Sous-nav</nav>,
}));

describe("Performance UI shared components", () => {
  it("rend le shell de page avec retour, sous-navigation, titre et actions", () => {
    render(
      <PerformancePageShell
        title="Performances réseau"
        description="Description courte"
        actions={<button type="button">Changer période</button>}
      >
        <p>Contenu page</p>
      </PerformancePageShell>,
    );

    expect(screen.getByTestId("admin-layout")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /retour à performances/i }),
    ).toHaveAttribute("href", "/b4ck0ff1ce/performances");
    expect(
      screen.getByRole("navigation", { name: "Performances" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Performances réseau" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Description courte")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Changer période" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Contenu page")).toBeInTheDocument();
  });

  it("rend une carte de graphe avec période et contenu", () => {
    render(
      <PerformanceChartCard
        title="Débit réseau"
        periodLabel="24 dernières heures"
      >
        <div>Graphique</div>
      </PerformanceChartCard>,
    );

    expect(
      screen.getByRole("heading", { name: "Débit réseau" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/24 dernières heures/i)).toBeInTheDocument();
    expect(screen.getByText("Graphique")).toBeInTheDocument();
  });

  it("rend les états standards", () => {
    render(
      <>
        <PerformanceLoadingState />
        <PerformanceEmptyState>Aucune donnée.</PerformanceEmptyState>
        <PerformanceInfoNotice>Information.</PerformanceInfoNotice>
      </>,
    );

    expect(screen.getByText("Chargement…")).toBeInTheDocument();
    expect(screen.getByText("Aucune donnée.")).toBeInTheDocument();
    expect(screen.getByText("Information.")).toBeInTheDocument();
  });
});
