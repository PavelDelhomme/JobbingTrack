const dns = require('dns').promises;
const https = require('https');

const DOMAIN_HINTS = [
  {
    test: (d) => d.endsWith('.ovh') || d === 'ovh.net',
    host: 'imap.mail.ovh.net',
    port: 993,
    smtpHost: 'smtp.mail.ovh.net',
    smtpPort: 587,
    provider: 'OVH',
  },
  {
    test: (d) => d === 'gmail.com' || d === 'googlemail.com',
    host: 'imap.gmail.com',
    port: 993,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    provider: 'Gmail',
  },
  {
    test: (d) => d === 'outlook.com' || d === 'hotmail.com' || d === 'live.com' || d.endsWith('.outlook.com'),
    host: 'outlook.office365.com',
    port: 993,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    provider: 'Microsoft',
  },
  {
    test: (d) => d === 'proton.me' || d === 'protonmail.com' || d.endsWith('.proton.me'),
    host: '127.0.0.1',
    port: 1143,
    smtpHost: '127.0.0.1',
    smtpPort: 1025,
    provider: 'Proton',
    note: 'proton_bridge_required',
  },
  {
    test: (d) => d === 'yahoo.com' || d.endsWith('.yahoo.com'),
    host: 'imap.mail.yahoo.com',
    port: 993,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 587,
    provider: 'Yahoo',
  },
  {
    test: (d) => d === 'icloud.com' || d === 'me.com' || d === 'mac.com',
    host: 'imap.mail.me.com',
    port: 993,
    smtpHost: 'smtp.mail.me.com',
    smtpPort: 587,
    provider: 'Apple',
  },
];

const MX_IMAP_HINTS = [
  { pattern: /ovh\.net/i, host: 'imap.mail.ovh.net', port: 993, smtpHost: 'smtp.mail.ovh.net', smtpPort: 587, provider: 'OVH' },
  { pattern: /google\.com/i, host: 'imap.gmail.com', port: 993, smtpHost: 'smtp.gmail.com', smtpPort: 587, provider: 'Gmail' },
  { pattern: /outlook\.com|microsoft\.com/i, host: 'outlook.office365.com', port: 993, smtpHost: 'smtp.office365.com', smtpPort: 587, provider: 'Microsoft' },
  { pattern: /yahoodns\.net/i, host: 'imap.mail.yahoo.com', port: 993, smtpHost: 'smtp.mail.yahoo.com', smtpPort: 587, provider: 'Yahoo' },
];

function toSuggestion(row, source, extra = {}) {
  return {
    imapHost: row.host,
    imapPort: row.port,
    imapUseTls: true,
    smtpHost: row.smtpHost || null,
    smtpPort: row.smtpPort || null,
    smtpUseTls: true,
    provider: row.provider,
    source,
    note: row.note || extra.note || null,
    ...extra,
  };
}

function extractDomain(emailAddress) {
  const email = String(emailAddress || '').trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at <= 0) return null;
  return email.slice(at + 1);
}

function hintFromDomain(domain) {
  const hit = DOMAIN_HINTS.find((row) => row.test(domain));
  if (!hit) return null;
  return toSuggestion(hit, 'domain_hint');
}

async function hintFromMx(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    const sorted = [...mx].sort((a, b) => a.priority - b.priority);
    const exchange = sorted[0]?.exchange || '';
    for (const row of MX_IMAP_HINTS) {
      if (row.pattern.test(exchange)) {
        return toSuggestion(row, 'mx_hint', { mxHost: exchange });
      }
    }
  } catch {
    /* ignore DNS errors */
  }
  return null;
}

function parseAutoconfigServer(block, type) {
  if (!block) return null;
  const host = block.match(/<hostname>([^<]+)<\/hostname>/i)?.[1]?.trim();
  const port = block.match(/<port>(\d+)<\/port>/i)?.[1];
  const socketType = block.match(/<socketType>([^<]+)<\/socketType>/i)?.[1];
  if (!host) return null;
  const useTls = String(socketType || 'SSL').toUpperCase() !== 'PLAIN';
  return {
    host,
    port: Number(port) || (type === 'smtp' ? 587 : 993),
    useTls,
  };
}

function fetchThunderbirdAutoconfig(domain) {
  return new Promise((resolve) => {
    const url = `https://autoconfig.thunderbird.net/v1.1/${encodeURIComponent(domain)}`;
    const req = https.get(url, { timeout: 6000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        resolve(null);
        return;
      }
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        const incoming = body.match(/<incomingServer[^>]*type="imap"[^>]*>([\s\S]*?)<\/incomingServer>/i);
        const outgoing = body.match(/<outgoingServer[^>]*type="smtp"[^>]*>([\s\S]*?)<\/outgoingServer>/i);
        const imap = parseAutoconfigServer(incoming?.[1], 'imap');
        if (!imap) {
          resolve(null);
          return;
        }
        const smtp = parseAutoconfigServer(outgoing?.[1], 'smtp');
        resolve({
          imapHost: imap.host,
          imapPort: imap.port,
          imapUseTls: imap.useTls,
          smtpHost: smtp?.host || null,
          smtpPort: smtp?.port || null,
          smtpUseTls: smtp?.useTls !== false,
          provider: 'autoconfig',
          source: 'thunderbird_autoconfig',
        });
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

function genericGuess(domain) {
  return {
    imapHost: `imap.${domain}`,
    imapPort: 993,
    imapUseTls: true,
    smtpHost: `smtp.${domain}`,
    smtpPort: 587,
    smtpUseTls: true,
    provider: 'generic',
    source: 'generic_guess',
    confidence: 'low',
  };
}

async function discoverImapSettings(emailAddress) {
  const domain = extractDomain(emailAddress);
  if (!domain) {
    return { found: false, reason: 'invalid_email' };
  }

  const candidates = [];
  const domainHint = hintFromDomain(domain);
  if (domainHint) candidates.push(domainHint);

  const mxHint = await hintFromMx(domain);
  if (mxHint) candidates.push(mxHint);

  const thunderbird = await fetchThunderbirdAutoconfig(domain);
  if (thunderbird) candidates.push(thunderbird);

  if (candidates.length === 0) {
    return { found: true, suggested: genericGuess(domain), alternatives: [] };
  }

  const best = candidates[0];
  return {
    found: true,
    emailAddress: String(emailAddress).trim().toLowerCase(),
    domain,
    suggested: best,
    alternatives: candidates.slice(1),
  };
}

module.exports = {
  discoverImapSettings,
  extractDomain,
  hintFromDomain,
  DOMAIN_HINTS,
};
