export type WafPolicyInput = {
  enabled?: boolean;
  rules?: Array<{ enabled?: boolean; severity?: string }>;
};

export type NotificationPolicyInput = {
  enabled?: boolean;
  recipients?: string[];
  levels?: string[];
};

export type SecurityPolicyPostureInput = {
  waf?: WafPolicyInput | null;
  firewallRulesCount: number;
  blockedIpsCount: number;
  notifications?: NotificationPolicyInput | null;
};

export type SecurityPolicyPostureItem = {
  key: string;
  label: string;
  value: string;
  status: "ok" | "warning" | "danger" | "info";
  detail: string;
};

function activeCriticalWafRules(waf?: WafPolicyInput | null): number {
  return (waf?.rules || []).filter(
    (rule) =>
      rule.enabled !== false &&
      ["critical", "high"].includes(String(rule.severity || "").toLowerCase()),
  ).length;
}

export function buildSecurityPolicyPosture({
  waf,
  firewallRulesCount,
  blockedIpsCount,
  notifications,
}: SecurityPolicyPostureInput): SecurityPolicyPostureItem[] {
  const activeCriticalRules = activeCriticalWafRules(waf);
  const notificationLevels = new Set(
    (notifications?.levels || []).map((level) => level.toLowerCase()),
  );
  const hasCriticalNotification =
    notifications?.enabled !== false &&
    (notifications?.recipients || []).length > 0 &&
    notificationLevels.has("critical");

  return [
    {
      key: "waf",
      label: "WAF",
      value: waf?.enabled ? "Actif" : "Désactivé",
      status: waf?.enabled ? "ok" : "danger",
      detail: `${activeCriticalRules} règle(s) high/critical active(s)`,
    },
    {
      key: "firewall",
      label: "Firewall",
      value: `${firewallRulesCount} règle(s)`,
      status: firewallRulesCount > 0 ? "ok" : "warning",
      detail:
        firewallRulesCount > 0
          ? "Règles explicites disponibles"
          : "Aucune règle persistée",
    },
    {
      key: "blocked-ips",
      label: "Réponse IP",
      value: `${blockedIpsCount} IP`,
      status: blockedIpsCount > 0 ? "info" : "warning",
      detail:
        blockedIpsCount > 0
          ? "Blocages actifs ou manuels visibles"
          : "Aucun blocage IP actif",
    },
    {
      key: "notifications",
      label: "Alertes critiques",
      value: hasCriticalNotification ? "Notifiées" : "À configurer",
      status: hasCriticalNotification ? "ok" : "danger",
      detail: hasCriticalNotification
        ? `${notifications?.recipients?.length || 0} destinataire(s)`
        : "Aucun destinataire critical effectif",
    },
    {
      key: "automation",
      label: "Auto-blocage",
      value: "Borné",
      status: "warning",
      detail:
        "High/critical restent en recommandation tant que B12 n'est pas validé",
    },
  ];
}
