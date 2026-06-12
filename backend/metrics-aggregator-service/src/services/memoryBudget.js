const DEFAULT_STACK_MEMORY_LIMIT_MB = 8192;

const DEFAULT_SERVICE_MEMORY_BUDGET_MB = Object.freeze({
  'jobbingtrack-postgres': 768,
  'jobbingtrack-redis': 192,
  'jobbingtrack-api-gateway': 384,
  'jobbingtrack-frontend': 2048,
  'jobbingtrack-monitoring-agent-rs': 256,
  'jobbingtrack-monitoring-c': 128,
  'jobbingtrack-log-collector-rs': 192,
  'jobbingtrack-metrics-aggregator': 512,
  'jobbingtrack-auth-service': 384,
  'jobbingtrack-application-service': 256,
  'jobbingtrack-company-service': 256,
  'jobbingtrack-contact-service': 192,
  'jobbingtrack-interview-service': 192,
  'jobbingtrack-call-service': 192,
  'jobbingtrack-event-service': 192,
  'jobbingtrack-followup-service': 192,
  'jobbingtrack-profile-service': 192,
  'jobbingtrack-notification-service': 384,
  'jobbingtrack-dashboard-service': 384,
  'jobbingtrack-workflow-service': 256,
  'jobbingtrack-flutter-mobile': 512,
  'jobbingtrack-security-service': 384,
  'jobbingtrack-deployment-service': 256,
  'jobbingtrack-mailhog': 128,
});

function readPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getStackMemoryLimitMb() {
  return Math.round(
    readPositiveNumber(
      process.env.JOBBINGTRACK_STACK_MEMORY_LIMIT_MB,
      DEFAULT_STACK_MEMORY_LIMIT_MB,
    ),
  );
}

function normalizeContainerName(containerName = '') {
  return String(containerName)
    .replace(/^\//, '')
    .replace(/-prod$/, '')
    .replace(/-preview$/, '')
    .replace(/-staging$/, '')
    .replace(/(-prod|-preview|-staging)?-[0-9]+$/, '')
    .replace(/_[0-9]+$/, '')
    .trim();
}

function budgetEnvName(containerName) {
  const key = normalizeContainerName(containerName)
    .replace(/^jobbingtrack-/, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toUpperCase();
  return key ? `JOBBINGTRACK_${key}_MEMORY_LIMIT_MB` : '';
}

function getServiceMemoryBudgetMb(containerName) {
  const normalized = normalizeContainerName(containerName);
  const envName = budgetEnvName(normalized);
  const defaultBudget =
    DEFAULT_SERVICE_MEMORY_BUDGET_MB[normalized] ||
    DEFAULT_SERVICE_MEMORY_BUDGET_MB[`jobbingtrack-${normalized}`] ||
    256;

  return Math.round(readPositiveNumber(process.env[envName], defaultBudget));
}

function looksLikeHostMemoryLimit(observedLimitMb, stackLimitMb = getStackMemoryLimitMb()) {
  const limit = Number(observedLimitMb);
  if (!Number.isFinite(limit) || limit <= 0) return true;
  return limit > stackLimitMb;
}

function normalizeContainerMemoryMb({
  containerName,
  usageMb = 0,
  observedLimitMb = 0,
  configuredLimitMb = 0,
}) {
  const usage = Math.max(0, Number(usageMb) || 0);
  const configured = Number(configuredLimitMb) || 0;
  const observed = Number(observedLimitMb) || 0;
  const stackLimitMb = getStackMemoryLimitMb();
  const serviceBudgetMb = getServiceMemoryBudgetMb(containerName);

  let limitMb = serviceBudgetMb;
  let limitSource = 'jobbingtrack-budget';

  if (configured > 0) {
    limitMb = configured;
    limitSource = 'docker-hostconfig';
  } else if (!looksLikeHostMemoryLimit(observed, stackLimitMb)) {
    limitMb = observed;
    limitSource = 'docker-stats';
  }

  const percent = limitMb > 0 ? (usage / limitMb) * 100 : 0;

  return {
    limitMb: Math.round(limitMb),
    limitSource,
    percent: parseFloat(Math.min(100, Math.max(0, percent)).toFixed(4)),
    rawObservedLimitMb: observed > 0 ? Math.round(observed) : 0,
    serviceBudgetMb,
    stackLimitMb,
  };
}

function normalizeDockerMemoryBytes({ containerName, usageBytes = 0, observedLimitBytes = 0 }) {
  const usageMb = Number(usageBytes || 0) / 1024 / 1024;
  const observedLimitMb = Number(observedLimitBytes || 0) / 1024 / 1024;
  const normalized = normalizeContainerMemoryMb({
    containerName,
    usageMb,
    observedLimitMb,
  });

  return {
    ...normalized,
    limitBytes: normalized.limitMb * 1024 * 1024,
  };
}

module.exports = {
  DEFAULT_SERVICE_MEMORY_BUDGET_MB,
  DEFAULT_STACK_MEMORY_LIMIT_MB,
  getServiceMemoryBudgetMb,
  getStackMemoryLimitMb,
  normalizeContainerMemoryMb,
  normalizeContainerName,
  normalizeDockerMemoryBytes,
};
