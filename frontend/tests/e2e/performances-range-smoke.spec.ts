import { test, expect } from "@playwright/test";

const PAGES = [
  "/b4ck0ff1ce/performances",
  "/b4ck0ff1ce/performances/network",
  "/b4ck0ff1ce/performances/disk",
  "/b4ck0ff1ce/performances/containers",
  "/b4ck0ff1ce/performances/latency",
  "/b4ck0ff1ce/performances/correlation",
] as const;

async function waitForChartsReady(page: import("@playwright/test").Page) {
  await page
    .locator("main")
    .first()
    .waitFor({ state: "visible", timeout: 60_000 });
  await expect
    .poll(
      async () => {
        const loading = await page.getByText(/^Chargement…$/i).count();
        const charts = await countRenderableCharts(page);
        return loading === 0 && charts > 0;
      },
      { timeout: 90_000, intervals: [500, 1000, 2000] },
    )
    .toBeTruthy();
}

async function countRenderableCharts(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const charts = Array.from(
      document.querySelectorAll<SVGSVGElement>("main svg.recharts-surface"),
    );
    return charts.filter((svg) => {
      const box = svg.getBoundingClientRect();
      if (box.width < 80 || box.height < 80) return false;
      const hasCurve = Array.from(
        svg.querySelectorAll("path.recharts-curve"),
      ).some((path) => (path.getAttribute("d") || "").length > 20);
      const hasBar = Array.from(
        svg.querySelectorAll("path.recharts-rectangle"),
      ).some((path) => (path.getAttribute("d") || "").length > 20);
      return hasCurve || hasBar;
    }).length;
  });
}

async function selectRangeIfPresent(
  page: import("@playwright/test").Page,
  values: string | string[],
) {
  const wanted = Array.isArray(values) ? values : [values];
  const selectors = [
    page.getByLabel("Période").first(),
    page.getByLabel("Fenêtre temporelle").first(),
  ];
  for (const selector of selectors) {
    if (!(await selector.isVisible().catch(() => false))) continue;
    for (const value of wanted) {
      const option = selector.locator(`option[value="${value}"]`);
      if ((await option.count()) === 0) continue;
      await selector.selectOption(value);
      return true;
    }
  }
  return false;
}

async function expectNoNetworkErrorOverlay(
  page: import("@playwright/test").Page,
) {
  const overlay = page.getByText(/Network Error|AxiosError/i);
  await expect(overlay).toHaveCount(0, { timeout: 5_000 });
}

for (const path of PAGES) {
  test(`${path} — plages sans flash vide ni Network Error`, async ({
    page,
  }) => {
    test.setTimeout(path.includes("/correlation") ? 180_000 : 120_000);
    await page.goto(path, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await waitForChartsReady(page);
    await expectNoNetworkErrorOverlay(page);

    const initialCharts = await countRenderableCharts(page);
    expect(initialCharts).toBeGreaterThan(0);

    const selected7d = await selectRangeIfPresent(page, ["7d", "168"]);
    if (selected7d) {
      await waitForChartsReady(page);
      await expectNoNetworkErrorOverlay(page);
      expect(await countRenderableCharts(page)).toBeGreaterThan(0);
      const loading = page.getByText(/^Chargement…$/i);
      await expect(loading).toHaveCount(0, { timeout: 15_000 });
    }

    const selected24h = await selectRangeIfPresent(page, ["24h", "24"]);
    if (selected24h) {
      await waitForChartsReady(page);
      await expectNoNetworkErrorOverlay(page);
      expect(await countRenderableCharts(page)).toBeGreaterThan(0);
    }
  });
}
