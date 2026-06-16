export const SECURITY_SCORE_WEIGHTS_STORAGE_KEY = "securityScoreWeights";

export type SecurityScoreWeights = {
  threats: number;
  logsNoise: number;
  wafDisabled: number;
};

export type SecurityScoreInputs = {
  threatsCount: number;
  logsCount: number;
  blockedIpsCount: number;
  wafEnabled: boolean | null;
};

export const DEFAULT_SECURITY_SCORE_WEIGHTS: SecurityScoreWeights = {
  threats: 2,
  logsNoise: 1,
  wafDisabled: 15,
};

export function sanitizeSecurityScoreWeights(
  value: Partial<SecurityScoreWeights> | null | undefined,
): SecurityScoreWeights {
  return {
    threats:
      typeof value?.threats === "number" && Number.isFinite(value.threats)
        ? Math.min(5, Math.max(1, Math.round(value.threats)))
        : DEFAULT_SECURITY_SCORE_WEIGHTS.threats,
    logsNoise:
      typeof value?.logsNoise === "number" && Number.isFinite(value.logsNoise)
        ? Math.min(3, Math.max(1, Math.round(value.logsNoise)))
        : DEFAULT_SECURITY_SCORE_WEIGHTS.logsNoise,
    wafDisabled:
      typeof value?.wafDisabled === "number" &&
      Number.isFinite(value.wafDisabled)
        ? Math.min(25, Math.max(5, Math.round(value.wafDisabled)))
        : DEFAULT_SECURITY_SCORE_WEIGHTS.wafDisabled,
  };
}

export function calculateSecurityScore(
  inputs: SecurityScoreInputs,
  weights: SecurityScoreWeights,
): number {
  const normalizedWeights = sanitizeSecurityScoreWeights(weights);
  const score =
    100 -
    Math.min(40, Math.max(0, inputs.threatsCount) * normalizedWeights.threats) -
    Math.min(
      30,
      Math.max(0, Math.max(0, inputs.logsCount) - 20) *
        normalizedWeights.logsNoise,
    ) -
    Math.min(20, Math.max(0, inputs.blockedIpsCount) > 0 ? 10 : 0) -
    (inputs.wafEnabled === false ? normalizedWeights.wafDisabled : 0);

  return Math.max(0, Math.min(100, Math.round(score)));
}
