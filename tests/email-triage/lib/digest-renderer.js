const DEFAULT_APP_URL = 'https://jobbingtrack.localhost:5443';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSection(title, items = [], appUrl = DEFAULT_APP_URL) {
  if (!items.length) {
    return '';
  }

  const rows = items
    .map((item) => {
      const label = escapeHtml(item.label || item.title || 'Action');
      const href = escapeHtml(item.href || `${appUrl}/`);
      return `<li><a href="${href}">${label}</a></li>`;
    })
    .join('');

  return `<section><h2>${escapeHtml(title)}</h2><ul>${rows}</ul></section>`;
}

function renderDigestHtml(summary = {}, options = {}) {
  const appUrl = options.appUrl || summary.appUrl || DEFAULT_APP_URL;
  const sections = [
    renderSection('Tâches demain', summary.tomorrowTasks, appUrl),
    renderSection('Tâches en retard', summary.overdueTasks, appUrl),
    renderSection('Relances recommandées', summary.recommendedFollowups, appUrl),
    renderSection('Entretiens à préparer', summary.interviewsToPrepare, appUrl),
    renderSection('Emails importants', summary.importantEmails, appUrl),
    renderSection('À confirmer', summary.needsConfirmation, appUrl),
  ].filter(Boolean);

  const subject = escapeHtml(summary.subject || 'Digest recherche emploi JobbingTrack');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
  <h1>${subject}</h1>
  <p>Récapitulatif JobbingTrack — aucun envoi externe automatique sans validation utilisateur.</p>
  ${sections.join('\n')}
  <p style="margin-top: 24px;"><a href="${escapeHtml(appUrl)}">Ouvrir JobbingTrack</a></p>
</body>
</html>`;
}

function renderDigestText(summary = {}, options = {}) {
  const appUrl = options.appUrl || summary.appUrl || DEFAULT_APP_URL;
  const lines = [
    summary.subject || 'Digest recherche emploi JobbingTrack',
    '',
    'Récapitulatif JobbingTrack',
  ];

  const blocks = [
    ['Tâches demain', summary.tomorrowTasks],
    ['Tâches en retard', summary.overdueTasks],
    ['Relances recommandées', summary.recommendedFollowups],
    ['Entretiens à préparer', summary.interviewsToPrepare],
    ['Emails importants', summary.importantEmails],
    ['À confirmer', summary.needsConfirmation],
  ];

  for (const [title, items] of blocks) {
    if (!items || !items.length) continue;
    lines.push('', title);
    for (const item of items) {
      lines.push(`- ${item.label || item.title || 'Action'} (${item.href || appUrl})`);
    }
  }

  lines.push('', `Ouvrir JobbingTrack: ${appUrl}`);
  return lines.join('\n');
}

function validateDigestRender(html, text) {
  const issues = [];
  const content = `${html}\n${text}`;

  if (!html.includes('<h1>')) {
    issues.push({ field: 'html', reason: 'missing_title' });
  }
  if (!content.includes('jobbingtrack')) {
    issues.push({ field: 'content', reason: 'missing_jobbingtrack_reference' });
  }
  if (/(password|smtp_pass|refresh_token|secret)/i.test(content)) {
    issues.push({ field: 'content', reason: 'possible_secret_leak' });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

module.exports = {
  DEFAULT_APP_URL,
  renderDigestHtml,
  renderDigestText,
  validateDigestRender,
};
