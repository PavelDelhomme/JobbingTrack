/**
 * Tests page /backoffice/analytics (hub application & utilisateurs)
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import AnalyticsPage from "../page";

jest.mock("@/components/features", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

describe("AnalyticsPage (/backoffice/analytics)", () => {
  it("rend la page sans erreur React", async () => {
    await act(async () => {
      render(<AnalyticsPage />);
    });
    expect(screen.getByTestId("admin-layout")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^Analytics$/i }),
    ).toBeInTheDocument();
  });

  it("propose les liens Application et Utilisateurs", async () => {
    await act(async () => {
      render(<AnalyticsPage />);
    });
    expect(screen.getByRole("link", { name: /Application/i })).toHaveAttribute(
      "href",
      "/backoffice/analytics/application/performance",
    );
    expect(screen.getByRole("link", { name: /Utilisateurs/i })).toHaveAttribute(
      "href",
      "/backoffice/user-analytics",
    );
  });
});
