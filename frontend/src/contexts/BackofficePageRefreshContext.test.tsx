/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import {
  BackofficePageRefreshProvider,
  useBackofficePageRefresh,
} from "./BackofficePageRefreshContext";
import { useRegisterBackofficeRefresh } from "../hooks/useRegisterBackofficeRefresh";

function PageWithRefresh({ onRefresh }: { onRefresh: () => void }) {
  useRegisterBackofficeRefresh(onRefresh);
  return <div>Page content</div>;
}

function RefreshButton() {
  const ctx = useBackofficePageRefresh();
  if (!ctx) return null;
  return (
    <button
      type="button"
      disabled={!ctx.hasHandler || ctx.isRefreshing}
      onClick={() => void ctx.refresh()}
    >
      Actualiser
    </button>
  );
}

describe("BackofficePageRefreshProvider", () => {
  it("active le bouton quand la page enregistre un handler", async () => {
    const onRefresh = jest.fn();

    render(
      <BackofficePageRefreshProvider>
        <RefreshButton />
        <PageWithRefresh onRefresh={onRefresh} />
      </BackofficePageRefreshProvider>,
    );

    const btn = screen.getByRole("button", { name: "Actualiser" });
    expect(btn).not.toBeDisabled();

    fireEvent.click(btn);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("désactive le bouton sans handler enregistré", () => {
    render(
      <BackofficePageRefreshProvider>
        <RefreshButton />
      </BackofficePageRefreshProvider>,
    );

    expect(screen.getByRole("button", { name: "Actualiser" })).toBeDisabled();
  });
});
