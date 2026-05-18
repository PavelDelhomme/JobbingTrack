/**
 * Tests page /b4ck0ff1ce/analytics (hub application & utilisateurs)
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

describe("AnalyticsPage (/b4ck0ff1ce/analytics)", () => {
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
      "/b4ck0ff1ce/analytics/application/performance",
    );
    expect(screen.getByRole("link", { name: /Utilisateurs/i })).toHaveAttribute(
      "href",
      "/b4ck0ff1ce/user-analytics",
    );
  });
});
