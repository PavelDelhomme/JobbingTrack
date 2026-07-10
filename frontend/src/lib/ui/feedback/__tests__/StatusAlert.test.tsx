import { render, screen } from "@testing-library/react";
import { StatusAlert } from "@/lib/ui/feedback/StatusAlert";

describe("StatusAlert", () => {
  it("affiche titre et corps", () => {
    render(
      <StatusAlert tone="warning" title="Réinstallation recommandée">
        Détail lisible
      </StatusAlert>,
    );
    expect(screen.getByRole("alert")).toHaveAttribute("data-jt-tone", "warning");
    expect(screen.getByText("Réinstallation recommandée")).toBeInTheDocument();
    expect(screen.getByText("Détail lisible")).toBeInTheDocument();
  });

  it("expose le ton sémantique sur data-jt-tone", () => {
    render(<StatusAlert tone="success" title="OK" />);
    expect(screen.getByRole("alert")).toHaveAttribute("data-jt-tone", "success");
  });
});
