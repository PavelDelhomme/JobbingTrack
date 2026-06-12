"use client";

import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsPopup } from "./SettingsPopup";

jest.mock("@/lib/hooks/theme", () => ({
  useTheme: () => ({
    theme: "dark",
    actualTheme: "dark",
    systemTheme: "dark",
    toggleTheme: jest.fn(),
    setThemeMode: jest.fn(),
  }),
}));

jest.mock("@/lib/hooks/auth", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "admin@test.local" } }),
}));

jest.mock("@/lib/services/preferencesService", () => ({
  __esModule: true,
  default: {
    getUserPreferences: jest.fn().mockResolvedValue({
      refreshInterval: {
        logs: 30000,
        analytics: 30000,
        metrics: 30000,
        dashboard: 30000,
        services: 60000,
        notifications: 60000,
      },
      display: {
        itemsPerPage: 20,
        compactMode: false,
        showCharts: true,
        showMetrics: true,
        detailedMetrics: false,
      },
      notifications: {
        desktop: true,
        sound: false,
        highPriorityOnly: false,
        applicationUpdates: true,
        interviewReminders: true,
        followupReminders: true,
        deadlineAlerts: true,
        systemAlerts: true,
      },
      theme: "dark",
      language: "fr",
      timezone: "Europe/Paris",
    }),
    updateUserPreferences: jest.fn().mockResolvedValue({}),
  },
}));

describe("SettingsPopup fermeture", () => {
  it("ne rend rien quand fermé", () => {
    const { container } = render(
      <SettingsPopup isOpen={false} onClose={jest.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("ferme sur Escape", () => {
    const onClose = jest.fn();
    render(<SettingsPopup isOpen onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ferme sur clic extérieur (backdrop)", () => {
    const onClose = jest.fn();
    const { container } = render(
      <SettingsPopup isOpen onClose={onClose} />,
    );

    const backdrop = container.firstElementChild;
    expect(backdrop).not.toBeNull();
    fireEvent.mouseDown(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ne ferme pas sur clic dans le dialogue", () => {
    const onClose = jest.fn();
    render(<SettingsPopup isOpen onClose={onClose} />);

    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ferme via le bouton aria-label Fermer", () => {
    const onClose = jest.fn();
    render(<SettingsPopup isOpen onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("Fermer les paramètres"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
