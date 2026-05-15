const path = require('path');
const crypto = require('crypto');

describe('devTestBypassRequest — format jeton non-prod', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  test('refuse un secret sans préfixe versionné même s’il est long', () => {
    process.env = { ...originalEnv, NODE_ENV: 'development' };
    process.env.DEV_TEST_BYPASS_TOKEN = `${crypto.randomBytes(40).toString('hex')}longenough`;
    const { getConfiguredBypassToken } = require('../src/utils/devTestBypassRequest');
    expect(getConfiguredBypassToken()).toBeNull();
  });

  test('accepte uniquement le format jtbypass1- + suffixe', () => {
    process.env = { ...originalEnv, NODE_ENV: 'development' };
    const { generateDevTestBypassToken } = require(path.join(
      __dirname,
      '../../../config/dev-test-bypass-format.cjs'
    ));
    const t = generateDevTestBypassToken(32);
    process.env.DEV_TEST_BYPASS_TOKEN = t;
    jest.resetModules();
    const { getConfiguredBypassToken } = require('../src/utils/devTestBypassRequest');
    expect(getConfiguredBypassToken()).toBe(t);
  });

  test('en production, isDevTestBypassRequest est toujours false', () => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };
    const { generateDevTestBypassToken } = require(path.join(
      __dirname,
      '../../../config/dev-test-bypass-format.cjs'
    ));
    process.env.DEV_TEST_BYPASS_TOKEN = generateDevTestBypassToken(32);
    jest.resetModules();
    const { isDevTestBypassRequest } = require('../src/utils/devTestBypassRequest');
    const req = {
      get: (h) => (h === 'X-JobbingTrack-Dev-Test-Token' ? process.env.DEV_TEST_BYPASS_TOKEN : undefined),
    };
    expect(isDevTestBypassRequest(req)).toBe(false);
  });
});
