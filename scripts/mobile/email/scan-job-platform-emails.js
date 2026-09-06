#!/usr/bin/env node
/**
 * Scan IMAP (Gmail pro + OVH candidatures) pour emails LinkedIn / Indeed / HelloWork.
 * Usage: node scripts/mobile/email/scan-job-platform-emails.js
 */
const path = require('path');
const fs = require('fs');
const tls = require('tls');

const ROOT = path.resolve(__dirname, '../../..');

function loadEnv() {
  const vals = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    vals[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return vals;
}

function mask(email) {
  if (!email) return '?';
  const [u, d] = String(email).split('@');
  return `${(u || '').slice(0, 2)}***@${d || ''}`;
}

class ImapSession {
  constructor(cfg) {
    Object.assign(this, cfg);
    this.tag = 0;
    this.buf = '';
    this.lines = [];
  }

  next() {
    this.tag += 1;
    return `A${this.tag}`;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.sock = tls.connect(
        { host: this.host, port: this.port || 993, servername: this.host, rejectUnauthorized: true },
        () => resolve(),
      );
      this.sock.setEncoding('utf8');
      this.sock.on('error', reject);
      this.sock.on('data', (chunk) => {
        this.buf += chunk;
        const parts = this.buf.split('\r\n');
        this.buf = parts.pop() || '';
        for (const line of parts) this.lines.push(line);
      });
    });
  }

  async waitOk(tag, timeoutMs = 25000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const idx = this.lines.findIndex(
        (l) => l.startsWith(`${tag} OK`) || l.startsWith(`${tag} NO`) || l.startsWith(`${tag} BAD`),
      );
      if (idx >= 0) {
        const collected = this.lines.splice(0, idx + 1);
        const last = collected[collected.length - 1];
        if (last.startsWith(`${tag} NO`) || last.startsWith(`${tag} BAD`)) {
          throw new Error(last.slice(0, 200));
        }
        return collected;
      }
      await new Promise((r) => setTimeout(r, 40));
    }
    throw new Error(`IMAP timeout ${tag}`);
  }

  async cmd(s) {
    const tag = this.next();
    this.sock.write(`${tag} ${s}\r\n`);
    return this.waitOk(tag);
  }

  async authPlain() {
    const tag = this.next();
    this.sock.write(`${tag} AUTHENTICATE PLAIN\r\n`);
    const start = Date.now();
    while (Date.now() - start < 10000) {
      const i = this.lines.findIndex((l) => l.startsWith('+'));
      if (i >= 0) {
        this.lines.splice(i, 1);
        break;
      }
      await new Promise((r) => setTimeout(r, 30));
    }
    const b64 = Buffer.from(`\0${this.email}\0${this.password}`, 'utf8').toString('base64');
    this.sock.write(`${b64}\r\n`);
    return this.waitOk(tag);
  }

  close() {
    try {
      this.sock.end();
    } catch {
      /* ignore */
    }
  }
}

const PLATFORM_HINTS = [
  { id: 'linkedin', re: /linkedin/i },
  { id: 'indeed', re: /indeed/i },
  { id: 'hellowork', re: /hellowork|hello.?work|regionsjob/i },
  { id: 'apec', re: /apec/i },
  { id: 'welcome', re: /welcometothejungle|wttj/i },
];

async function scan(label, cfg, days = 180) {
  const imap = new ImapSession(cfg);
  await imap.connect();
  await new Promise((r) => setTimeout(r, 250));
  await imap.authPlain();
  await imap.cmd('SELECT INBOX');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const since = new Date(Date.now() - days * 864e5);
  const sinceStr = `${since.getDate()}-${months[since.getMonth()]}-${since.getFullYear()}`;
  const lines = await imap.cmd(`SEARCH SINCE ${sinceStr}`);
  const searchLine = lines.find((l) => l.startsWith('* SEARCH')) || '';
  const ids = searchLine.replace('* SEARCH', '').trim().split(/\s+/).filter(Boolean);
  const sample = ids.slice(-100);
  const hits = [];
  for (const id of sample) {
    try {
      const fl = await imap.cmd(`FETCH ${id} (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])`);
      const blob = fl.join('\n');
      const from = (blob.match(/From: ([^\r\n]+)/i) || [])[1] || '';
      const subject = (blob.match(/Subject: ([^\r\n]+)/i) || [])[1] || '';
      const date = (blob.match(/Date: ([^\r\n]+)/i) || [])[1] || '';
      const platforms = PLATFORM_HINTS.filter((p) => p.re.test(`${from} ${subject}`)).map((p) => p.id);
      if (platforms.length) {
        hits.push({
          platforms,
          from: from.slice(0, 120),
          subject: subject.slice(0, 160),
          date: date.slice(0, 50),
        });
      }
    } catch {
      /* skip */
    }
  }
  const allLines = await imap.cmd('SEARCH ALL');
  const allSearch = allLines.find((l) => l.startsWith('* SEARCH')) || '';
  const inboxTotal = allSearch.replace('* SEARCH', '').trim().split(/\s+/).filter(Boolean).length;
  imap.close();
  return {
    label,
    ok: true,
    email: mask(cfg.email),
    inboxTotal,
    sinceDays: days,
    idsInWindow: ids.length,
    scanned: sample.length,
    hits,
  };
}

async function main() {
  const env = loadEnv();
  const boxes = [
    {
      label: 'Gmail pro',
      host: 'imap.gmail.com',
      email: env.EMAIL_GMAIL_PRO_ACCOUNT,
      password: env.EMAIL_GMAIL_PRO_PASSWORD_APPLICATION || env.EMAIL_GMAIL_PRO_PASSWORD,
    },
    {
      label: 'OVH candidatures',
      host: env.TEST_EMAIL_TRIAGE_IMAP_HOST || 'imap.mail.ovh.net',
      email: env.EMAIL_TRIAGE_READ_ACCOUNT || env.TEST_EMAIL_TRIAGE_IMAP_EMAIL,
      password: env.EMAIL_TRIAGE_READ_PASSWORD || env.TEST_EMAIL_TRIAGE_IMAP_PASSWORD,
    },
  ];
  const out = { byPlatform: {}, boxes: [] };
  for (const box of boxes) {
    process.stderr.write(`Scanning ${box.label} (${mask(box.email)})…\n`);
    try {
      const res = await scan(box.label, box, 180);
      out.boxes.push(res);
      for (const hit of res.hits) {
        for (const p of hit.platforms) out.byPlatform[p] = (out.byPlatform[p] || 0) + 1;
      }
    } catch (e) {
      out.boxes.push({ label: box.label, ok: false, email: mask(box.email), error: e.message });
    }
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
