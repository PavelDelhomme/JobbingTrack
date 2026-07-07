const { buildAgentRecapHtml, escapeHtml } = require("../../scripts/ops/build-agent-recap-html.cjs");

describe("buildAgentRecapHtml", () => {
  it("produit un HTML structuré avec sections colorées", () => {
    const html = buildAgentRecapHtml({
      title: "Récap test",
      branch: "feat/test",
      summary: "Session de validation.",
      kpis: [{ label: "smokes OK", value: "3/3", tone: "ok" }],
      sections: [
        { status: "ok", title: "Validé", items: ["IMAP OVH OK"] },
        { status: "ko", title: "Bloqué", items: ["Item KO"] },
      ],
      tables: [
        {
          title: "Tests",
          headers: ["Script", "Statut"],
          rows: [["smoke-imap", "OK"]],
        },
      ],
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Récap test");
    expect(html).toContain("feat/test");
    expect(html).toContain("#f0fdf4");
    expect(html).toContain("#fef2f2");
    expect(html).toContain("smoke-imap");
    expect(html).not.toContain("<pre");
  });

  it("échappe le contenu utilisateur", () => {
    const html = buildAgentRecapHtml({
      title: "<script>alert(1)</script>",
      sections: [{ status: "info", title: "T", items: ["<img onerror=1>"] }],
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img onerror=1&gt;");
  });

  it("escapeHtml neutralise les caractères HTML", () => {
    expect(escapeHtml('a & b <c>')).toBe("a &amp; b &lt;c&gt;");
  });
});
