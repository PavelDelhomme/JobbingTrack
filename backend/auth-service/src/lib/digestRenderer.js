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
      const href = escapeHtml(item.href || `${appUrl}/agent`);
      return `<li><a href="${href}">${label}</a></li>`;
    })
    .join('');

  return `<section><h2>${escapeHtml(title)}</h2><ul>${rows}</ul></section>`;
}

function renderDigestHtml(summary = {}, options = {}) {
  const appUrl = options.appUrl || summary.appUrl || DEFAULT_APP_URL;
  const sections = [
    renderSection('Emails importants', summary.importantEmails, appUrl),
    renderSection('Entretiens à préparer', summary.interviewsToPrepare, appUrl),
    renderSection('Relances recommandées', summary.recommendedFollowups, appUrl),
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
  <p style="margin-top: 24px;"><a href="${escapeHtml(appUrl)}/agent">Ouvrir l’agent recherche</a></p>
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
    ['Emails importants', summary.importantEmails],
    ['Entretiens à préparer', summary.interviewsToPrepare],
    ['Relances recommandées', summary.recommendedFollowups],
    ['À confirmer', summary.needsConfirmation],
  ];

  for (const [title, items] of blocks) {
    if (!items || !items.length) continue;
    lines.push('', title);
    for (const item of items) {
      lines.push(`- ${item.label || item.title || 'Action'} (${item.href || `${appUrl}/agent`})`);
    }
  }

  lines.push('', `Ouvrir JobbingTrack: ${appUrl}/agent`);
  return lines.join('\n');
}

function countDigestItems(summary = {}) {
  return (
    (summary.importantEmails?.length || 0) +
    (summary.interviewsToPrepare?.length || 0) +
    (summary.recommendedFollowups?.length || 0) +
    (summary.needsConfirmation?.length || 0)
  );
}

module.exports = {
  DEFAULT_APP_URL,
  renderDigestHtml,
  renderDigestText,
  countDigestItems,
};
