import {
  calculateSecurityScore,
  DEFAULT_SECURITY_SCORE_WEIGHTS,
  sanitizeSecurityScoreWeights,
} from "./securityScore";

describe("securityScore", () => {
  it("calcule le score avec plafonds de pénalité", () => {
    expect(
      calculateSecurityScore(
        {
          threatsCount: 100,
          logsCount: 200,
          blockedIpsCount: 3,
          wafEnabled: false,
        },
        DEFAULT_SECURITY_SCORE_WEIGHTS,
      ),
    ).toBe(5);
  });

  it("ignore les métriques non sécuritaires et conserve un score borné", () => {
    expect(
      calculateSecurityScore(
        {
          threatsCount: 0,
          logsCount: 10,
          blockedIpsCount: 0,
          wafEnabled: true,
        },
        DEFAULT_SECURITY_SCORE_WEIGHTS,
      ),
    ).toBe(100);
  });

  it("normalise les poids venant du stockage navigateur", () => {
    expect(
      sanitizeSecurityScoreWeights({
        threats: 50,
        logsNoise: -1,
        wafDisabled: 2.2,
      }),
    ).toEqual({
      threats: 5,
      logsNoise: 1,
      wafDisabled: 5,
    });
  });
});
