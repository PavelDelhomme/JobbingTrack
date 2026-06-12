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

  await categoryInput.fill("network");
  await expect(page.getByText("Filtres modifiés, pas encore appliqués")).toBeVisible();
  await expect(page.getByText("catégorie network")).toHaveCount(0);

  await page.getByRole("button", { name: "Appliquer les filtres" }).click();
  await expect(page.getByText("catégorie network")).toBeVisible();

  await eventTypeInput.fill("network_threat_detected");
  await page.getByRole("button", { name: "Appliquer les filtres" }).click();
  await expect(page.getByText("type Menace réseau détectée")).toBeVisible();

  const dateSortButton = page.getByRole("button", { name: /Date/ });
  await expect(dateSortButton).toBeVisible();
  await dateSortButton.click();
  await expect(page.getByText("Tri Date : plus ancien d’abord")).toBeVisible();
});
