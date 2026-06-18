const { tryDecompressJson, tryDecompressBytes } = require('./diagnosticPayloadCodec');

const FEEDBACK_PREFIX = /^\[(bug|suggestion|signalement)\]\s/i;

function parseFeedbackCategory(message, metadata, crashType, rawCategory) {
  if (metadata?.category) return String(metadata.category);
  if (rawCategory) return String(rawCategory);
  const match = String(message || '').match(FEEDBACK_PREFIX);
  if (match?.[1]) return match[1].toLowerCase();
  if (crashType === 'user_feedback') return 'retour';
  return null;
}

function isUserFeedback({ crashType, message, metadata, category }) {
  if (metadata?.feedback === true) return true;
  if (category) return true;
  if (crashType === 'user_feedback') return true;
  if (crashType === 'ManualReport' && FEEDBACK_PREFIX.test(String(message || ''))) {
    return true;
  }
  return false;
}

function isEmptyDeviceInfo(deviceInfo) {
  if (!deviceInfo || typeof deviceInfo !== 'object') return true;
  return !Object.values(deviceInfo).some((v) => v != null && v !== '');
}

function enrichFromDiagnostic(report, diagnostic) {
  if (!diagnostic || typeof diagnostic !== 'object') return report;

  const next = { ...report };

  if (!next.screenName) {
    next.screenName =
      diagnostic.analytics?.currentScreen ||
      diagnostic.currentScreen ||
      null;
  }

  if (!next.sessionId && diagnostic.sessionId) {
    next.sessionId = diagnostic.sessionId;
  }

  if ((!next.userActions || next.userActions.length === 0) && diagnostic.recentActions?.length) {
    next.userActions = diagnostic.recentActions;
  }

  if (isEmptyDeviceInfo(next.deviceInfo)) {
    next.deviceInfo = {
      ...(next.deviceInfo || {}),
      deviceModel: diagnostic.deviceModel || next.deviceInfo?.deviceModel,
      osVersion: diagnostic.osVersion || next.deviceInfo?.osVersion,
      memoryRssMb: diagnostic.memoryRssMb || next.deviceInfo?.memoryRssMb,
      appVersion: next.appVersion || next.deviceInfo?.appVersion,
      platform: next.deviceInfo?.platform || 'mobile',
    };
  }

  return next;
}

function buildEffectiveStackTrace(report) {
  if (report.stackTrace && String(report.stackTrace).trim()) {
    return String(report.stackTrace).trim();
  }

  const parts = [];
  const diagnostic = report.diagnostic;

  if (diagnostic?.recentErrors?.length) {
    parts.push('--- Erreurs récentes (session) ---');
    for (const err of diagnostic.recentErrors.slice(-12)) {
      const head = `[${err.type || 'error'}] ${err.screen || '?'}: ${err.message || err.error || ''}`.trim();
      parts.push(head);
      if (err.stackTrace) parts.push(String(err.stackTrace));
    }
  }

  if (diagnostic?.errorActions?.length) {
    parts.push('--- Actions en erreur ---');
    for (const err of diagnostic.errorActions.slice(-8)) {
      parts.push(typeof err === 'string' ? err : JSON.stringify(err));
    }
  }

  const netLines = (report.userActions || []).filter(
    (a) => typeof a === 'string' && (a.startsWith('net ') || a.includes('Erreur')),
  );
  if (netLines.length) {
    parts.push('--- Erreurs réseau (journal) ---');
    parts.push(...netLines.slice(-10));
  }

  if (parts.length) return parts.join('\n');

  if (report.metadata?.feedback) {
    return [
      '(Retour manuel — aucune exception capturée au moment de l\'envoi.)',
      'Les crashs Flutter automatiques sont rapportés séparément s\'ils se produisent.',
      `Session: ${report.sessionId || '?'}`,
      `Écran: ${report.screenName || '?'}`,
    ].join('\n');
  }

  return null;
}

function normalizeCrashReport(body = {}) {
  const metadata = { ...(body.metadata && typeof body.metadata === 'object' ? body.metadata : {}) };
  const category = parseFeedbackCategory(
    body.message,
    metadata,
    body.crashType,
    body.category,
  );

  if (category && !metadata.category) metadata.category = category;
  if (isUserFeedback({ crashType: body.crashType, message: body.message, metadata, category })) {
    metadata.feedback = true;
  }
  if (body.analytics && typeof body.analytics === 'object' && !metadata.analytics) {
    metadata.analytics = body.analytics;
  }
  if (body.sessionId && !metadata.sessionId) metadata.sessionId = body.sessionId;
  if (body.screenName && !metadata.screenName) metadata.screenName = body.screenName;

  const diagnostic = metadata.diagnosticCompressed
    ? tryDecompressJson(metadata.diagnosticCompressed)
    : null;

  let report = {
    crashType: body.crashType,
    message: body.message,
    stackTrace: body.stackTrace || body.stack || null,
    deviceInfo: body.deviceInfo || body.device || null,
    appVersion: body.appVersion || body.version || null,
    sessionId: body.sessionId || metadata.sessionId || null,
    screenName: body.screenName || metadata.screenName || null,
    userActions: Array.isArray(body.userActions) ? body.userActions : [],
    metadata,
    diagnostic,
  };

  report = enrichFromDiagnostic(report, diagnostic);

  let screenshotDataUrl = null;
  if (metadata.screenshotCompressed) {
    const pngBuffer = tryDecompressBytes(metadata.screenshotCompressed);
    if (pngBuffer && pngBuffer.length > 0) {
      screenshotDataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    }
  }

  if (report.appVersion && report.deviceInfo && !report.deviceInfo.appVersion) {
    report.deviceInfo = { ...report.deviceInfo, appVersion: report.appVersion };
  }

  return {
    ...report,
    effectiveStackTrace: buildEffectiveStackTrace(report),
    screenshotDataUrl,
  };
}

module.exports = {
  normalizeCrashReport,
  buildEffectiveStackTrace,
  parseFeedbackCategory,
  isUserFeedback,
};
