const zlib = require('zlib');

const PREFIX = 'gz:';

function compressHtml(html) {
  if (!html || typeof html !== 'string') return html;
  if (html.startsWith(PREFIX)) return html;
  const compressed = zlib.gzipSync(Buffer.from(html, 'utf8'));
  return `${PREFIX}${compressed.toString('base64')}`;
}

function decompressHtml(stored) {
  if (!stored || typeof stored !== 'string') return stored || '';
  if (!stored.startsWith(PREFIX)) return stored;
  const payload = Buffer.from(stored.slice(PREFIX.length), 'base64');
  return zlib.gunzipSync(payload).toString('utf8');
}

function maybeDecompressEmailContent(emailLog) {
  if (!emailLog || typeof emailLog !== 'object') return emailLog;
  if (emailLog.emailContent && typeof emailLog.emailContent === 'string') {
    return {
      ...emailLog,
      emailContent: decompressHtml(emailLog.emailContent),
      emailContentCompressed: emailLog.emailContent.startsWith(PREFIX),
    };
  }
  return emailLog;
}

module.exports = {
  compressHtml,
  decompressHtml,
  maybeDecompressEmailContent,
};
