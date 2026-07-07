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

  it("rend les workItems avec problème, cause, solution et commits", () => {
    const html = buildAgentRecapHtml({
      title: "Détail",
      workItems: [
        {
          id: "BL-26-02",
          title: "IMAP OVH",
          status: "ok",
          problem: "AUTH failed",
          cause: "MDP erroné",
          solution: "MDP corrigé + CLI",
          files: ["scripts/mobile/fetch-imap-verification.js"],
          commits: ["9911d8c5"],
          tests: [{ command: "node fetch-imap --check-only", result: "OK" }],
        },
      ],
    });

    expect(html).toContain("Travaux réalisés");
    expect(html).toContain("BL-26-02");
    expect(html).toContain("AUTH failed");
    expect(html).toContain("MDP corrigé");
    expect(html).toContain("9911d8c5");
    expect(html).toContain("fetch-imap-verification.js");
  });

  it("rend le tableau commits et incidents", () => {
    const html = buildAgentRecapHtml({
      title: "Commits",
      commits: [
        {
          hash: "abc1234",
          subject: "fix: test",
          date: "2026-07-07",
          branch: "dev",
          filesChanged: 3,
          insertions: 10,
          deletions: 2,
          topFiles: ["a.js"],
        },
      ],
      issues: [
        {
          problem: "Bug X",
          cause: "Cause Y",
          solution: "Fix Z",
          status: "resolved",
          relatedCommits: ["abc1234"],
        },
      ],
      nextSteps: ["Étape suivante"],
    });

    expect(html).toContain("Commits de la session");
    expect(html).toContain("abc1234");
    expect(html).toContain("Incidents");
    expect(html).toContain("Bug X");
    expect(html).toContain("Prochaines étapes");
    expect(html).toContain("Étape suivante");
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
    expect(escapeHtml("a & b <c>")).toBe("a &amp; b &lt;c&gt;");
  });
});
