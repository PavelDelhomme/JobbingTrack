/**
 * Limitation de débit pour scripts CLI (évite rafales DELETE/POST → WAF / rate-limit gateway).
 * @used-by scripts/mobile/setup/seed-realistic-user-data-api.js
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDelayMs(defaultMs = 300) {
  const raw = process.env.SEED_API_DELAY_MS || process.env.API_THROTTLE_MS || '';
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n >= 0 ? n : defaultMs;
}

function createApiThrottle(defaultMs = 300) {
  let delayMs = parseDelayMs(defaultMs);
  let lastAt = 0;

  async function waitTurn() {
    if (delayMs <= 0) return;
    const now = Date.now();
    const elapsed = now - lastAt;
    if (elapsed < delayMs) {
      await sleep(delayMs - elapsed);
    }
    lastAt = Date.now();
  }

  function wrapApi(apiFn) {
    return async (...args) => {
      await waitTurn();
      return apiFn(...args);
    };
  }

  return { waitTurn, wrapApi, get delayMs() { return delayMs; }, setDelayMs(ms) { delayMs = ms; } };
}

module.exports = { sleep, parseDelayMs, createApiThrottle };
