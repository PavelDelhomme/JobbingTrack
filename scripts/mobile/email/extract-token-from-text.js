/**
 * Extrait un token verify-email depuis le corps HTML/texte d'un email.
 */

function extractTokenFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;
  const links = [];
  while ((match = hrefRegex.exec(text)) !== null) links.push(match[1]);
  const inline = text.match(/(?:verify-email\?token=|verify-email\/)([a-zA-Z0-9_-]+)/);
  if (inline) return inline[1];
  for (const link of links) {
    const tokenMatch =
      link.match(/[?&]token=([a-zA-Z0-9_-]+)/) || link.match(/\/verify-email\/([a-zA-Z0-9_-]+)/);
    if (tokenMatch) return tokenMatch[1];
  }
  const loose = text.match(/token=([a-f0-9]{32,64})/i);
  return loose ? loose[1] : null;
}

module.exports = { extractTokenFromText };
