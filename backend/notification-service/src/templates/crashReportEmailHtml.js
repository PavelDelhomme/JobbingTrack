const { decompressHtml } = require('../utils/emailContentCodec');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatJsonBlock(value) {
  if (value == null) return '—';
  try {
    return escapeHtml(JSON.stringify(value, null, 2));
  } catch {
    return escapeHtml(String(value));
  }
}

function formatUserActions(actions) {
  if (!Array.isArray(actions) || actions.length === 0) return ['(aucune action enregistrée)'];
  return actions.map((a) => {
    if (typeof a === 'string') return a;
    if (a && typeof a === 'object') {
      const type = a.type || a.action || '?';
      if (type === 'navigation') {
        return `Navigation ${a.from || '?'} → ${a.to || '?'}`;
      }
      if (type === 'button_tap') {
        return `Tap ${a.buttonId || '?'} (${a.screen || '?'})`;
      }
      if (type === 'api_call') {
        return `API ${a.method || 'GET'} ${a.endpoint || '?'} → ${a.statusCode ?? '?'} (${a.durationMs ?? '?'} ms)`;
      }
      if (type === 'network_error') {
        return `Erreur réseau ${a.statusCode ?? '?'} ${a.url || a.error || ''}`.trim();
      }
      return `${type}: ${JSON.stringify(a)}`;
    }
    return String(a);
  });
}

function buildMetadataDisplayBlock(metadata, diagnostic) {
  if (!metadata || typeof metadata !== 'object') return '—';
  const display = { ...metadata };
  if (display.diagnosticCompressed) {
    display.diagnosticCompressed = `[gzip ${String(display.diagnosticCompressed).length} car.]`;
  }
  if (display.screenshotCompressed) {
    display.screenshotCompressed = `[capture gzip ${String(display.screenshotCompressed).length} car.]`;
  }
  if (diagnostic && typeof diagnostic === 'object') {
    display.diagnosticSummary = {
      deviceModel: diagnostic.deviceModel,
      osVersion: diagnostic.osVersion,
      memoryRssMb: diagnostic.memoryRssMb,
      actionsByType: diagnostic.actionsByType,
      recentActions: diagnostic.recentActions?.slice?.(0, 10),
      analytics: diagnostic.analytics,
    };
  }
  return formatJsonBlock(display);
}

function buildCrashReportEmailHtml(report) {
  const {
    crashType,
    message,
    stackTrace,
    effectiveStackTrace,
    deviceInfo,
    appVersion,
    sessionId,
    screenName,
    userActions,
    metadata,
    diagnostic,
    userId,
    timestamp,
    screenshotAttached,
    screenshotDataUrl,
  } = report;

  const category = metadata?.category;
  const isFeedback = metadata?.feedback === true;
  const accent = isFeedback ? '#2563eb' : '#dc2626';
  const badge = isFeedback
    ? `Retour utilisateur · ${escapeHtml(category || 'bug')}`
    : `Crash · ${escapeHtml(crashType || 'UNKNOWN')}`;

  const actions = formatUserActions(userActions);
  const actionsHtml = actions
    .slice(0, 40)
    .map((line) => `<li style="margin:4px 0;font-family:monospace;font-size:12px;">${escapeHtml(line)}</li>`)
    .join('');

  const deviceRows = [
    ['Plateforme', deviceInfo?.platform],
    ['OS', deviceInfo?.osVersion],
    ['Modèle', deviceInfo?.deviceModel],
    ['Version app', appVersion || deviceInfo?.appVersion],
    ['Mémoire RSS', deviceInfo?.memoryRssMb ? `${deviceInfo.memoryRssMb} Mo` : null],
    ['Locale', deviceInfo?.locale],
  ]
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 10px;color:#64748b;width:140px;">${escapeHtml(k)}</td><td style="padding:6px 10px;font-weight:600;">${escapeHtml(v)}</td></tr>`,
    )
    .join('');

  const metaBlock = buildMetadataDisplayBlock(metadata, diagnostic);
  const traceBlock = escapeHtml(
    effectiveStackTrace || stackTrace || '(non disponible)',
  );
  const screenshotHtml = screenshotDataUrl
    ? `<h3 style="margin:0 0 8px;font-size:15px;">Capture d'écran</h3>
              <p style="margin:0 0 8px;font-size:12px;color:#64748b;">Capture jointe par l'utilisateur (compressée côté mobile, affichée ici).</p>
              <img src="${screenshotDataUrl}" alt="Capture écran retour mobile" style="max-width:100%;height:auto;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:20px;" />`
    : (screenshotAttached
      ? `<p style="margin:0 0 20px;font-size:12px;color:#b45309;">Capture demandée mais décompression impossible — voir backoffice Retours.</p>`
      : '');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JobbingTrack — ${isFeedback ? 'Retour' : 'Crash'}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:${accent};color:#fff;padding:20px 24px;">
              <div style="font-size:12px;opacity:0.9;text-transform:uppercase;letter-spacing:0.06em;">JobbingTrack Mobile</div>
              <div style="font-size:22px;font-weight:700;margin-top:6px;">${badge}</div>
              <div style="font-size:13px;margin-top:8px;opacity:0.95;">${escapeHtml(timestamp || new Date().toISOString())}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <h2 style="margin:0 0 8px;font-size:16px;">Message</h2>
              <p style="margin:0 0 20px;padding:14px;background:#f8fafc;border-left:4px solid ${accent};border-radius:6px;line-height:1.5;">${escapeHtml(message)}</p>

              <table role="presentation" width="100%" style="margin-bottom:20px;font-size:14px;">
                <tr><td style="padding:4px 0;color:#64748b;">Écran</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(screenName || 'inconnu')}</td></tr>
                <tr><td style="padding:4px 0;color:#64748b;">Session</td><td style="padding:4px 0;font-family:monospace;font-size:12px;">${escapeHtml(sessionId || 'N/A')}</td></tr>
                <tr><td style="padding:4px 0;color:#64748b;">Utilisateur</td><td style="padding:4px 0;">${escapeHtml(userId || 'anonymous')}</td></tr>
                ${screenshotAttached && !screenshotDataUrl ? '<tr><td style="padding:4px 0;color:#64748b;">Capture</td><td style="padding:4px 0;color:#16a34a;font-weight:600;">Jointe (metadata)</td></tr>' : ''}
              </table>

              ${screenshotHtml}

              <h3 style="margin:0 0 8px;font-size:15px;">Appareil</h3>
              <table role="presentation" width="100%" style="border:1px solid #e2e8f0;border-radius:8px;border-collapse:collapse;margin-bottom:20px;">${deviceRows || '<tr><td style="padding:10px;">Non disponible</td></tr>'}</table>

              <h3 style="margin:0 0 8px;font-size:15px;">Stack trace / contexte technique</h3>
              <pre style="margin:0 0 20px;padding:12px;background:#0f172a;color:#e2e8f0;border-radius:8px;font-size:11px;line-height:1.45;white-space:pre-wrap;word-break:break-word;">${traceBlock}</pre>

              <h3 style="margin:0 0 8px;font-size:15px;">Actions utilisateur récentes</h3>
              <ul style="margin:0 0 20px;padding-left:20px;">${actionsHtml}</ul>

              <h3 style="margin:0 0 8px;font-size:15px;">Métadonnées</h3>
              <pre style="margin:0;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;line-height:1.45;white-space:pre-wrap;word-break:break-word;">${metaBlock}</pre>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f8fafc;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;">
              Rapport généré automatiquement · JobbingTrack · ne pas répondre à cet email automatique
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = {
  buildCrashReportEmailHtml,
  buildMetadataDisplayBlock,
  escapeHtml,
  decompressHtml,
};
