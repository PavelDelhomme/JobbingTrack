import { expect, test } from "@playwright/test";

test("Logs sécurité expose tri Date et autocomplétion des filtres", async ({
  page,
}) => {
  await page.goto("/b4ck0ff1ce/security/logs", {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });

  await expect(page.getByRole("heading", { name: "Logs sécurité" })).toBeVisible();
  await expect(page.getByText("Tri Date : plus récent d’abord")).toBeVisible();

  const categoryInput = page.getByLabel("Catégorie");
  const eventTypeInput = page.getByLabel("Type d’événement");
  const searchInput = page.getByLabel("Recherche");

  await expect(categoryInput).toHaveAttribute(
    "list",
    "security-log-category-options",
  );
  await expect(eventTypeInput).toHaveAttribute(
    "list",
    "security-log-event-type-options",
  );
  await expect(searchInput).toHaveAttribute(
    "list",
    "security-log-search-options",
  );

  await expect(page.locator("#security-log-category-options option")).toHaveCount(
    8,
  );
  await expect(
    page.locator("#security-log-event-type-options option"),
  ).toHaveCount(8);

  await categoryInput.fill("network");
  await expect(page.getByText("catégorie network")).toBeVisible();

  await eventTypeInput.fill("network_threat_detected");
  await expect(page.getByText("type Menace réseau détectée")).toBeVisible();

  const dateSortButton = page.getByRole("button", { name: /Date/ });
  await expect(dateSortButton).toBeVisible();
  await dateSortButton.click();
  await expect(page.getByText("Tri Date : plus ancien d’abord")).toBeVisible();
});
