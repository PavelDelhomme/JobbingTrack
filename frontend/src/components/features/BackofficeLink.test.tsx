import { fireEvent, render, screen } from "@testing-library/react";
import { BackofficeLink } from "./BackofficeLink";

jest.mock("next/link", () => {
  function MockLink({
    children,
    href,
    onClick,
    onAuxClick,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    onAuxClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  }) {
    return (
      <a href={href} onClick={onClick} onAuxClick={onAuxClick}>
        {children}
      </a>
    );
  }
  MockLink.displayName = "MockLink";
  return MockLink;
});

const openSpy = jest.fn();

describe("BackofficeLink", () => {
  const originalOpen = window.open;

  beforeEach(() => {
    openSpy.mockReset();
    window.open = openSpy as unknown as typeof window.open;
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  it("ouvre un nouvel onglet sans laisser la soft-nav sur Ctrl+clic", () => {
    render(
      <BackofficeLink href="/backoffice/pilotage">Pilotage</BackofficeLink>,
    );
    const link = screen.getByRole("link", { name: "Pilotage" });
    fireEvent.click(link, { ctrlKey: true });
    expect(openSpy).toHaveBeenCalledWith(
      "/backoffice/pilotage",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("laisse le clic simple au Link Next (pas de window.open)", () => {
    render(
      <BackofficeLink href="/backoffice/pilotage">Pilotage</BackofficeLink>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Pilotage" }));
    expect(openSpy).not.toHaveBeenCalled();
  });
});
