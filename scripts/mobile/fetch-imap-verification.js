/**
 * Récupère le corps d'un email récent via IMAP (Gmail app password ou OVH).
 * Implémentation minimale sans dépendance npm (TLS + protocole IMAP).
 */

const tls = require('tls');
const { extractTokenFromText } = require('./extract-token-from-text');

class ImapSession {
  constructor({ host, port, email, password }) {
    this.host = host;
    this.port = port || 993;
    this.email = email;
    this.password = password;
    this.tag = 0;
    this.socket = null;
    this.buffer = '';
  }

  nextTag() {
    this.tag += 1;
    return `A${this.tag}`;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = tls.connect(
        { host: this.host, port: this.port, servername: this.host, rejectUnauthorized: true },
        () => resolve(),
      );
      this.socket.setEncoding('utf8');
      this.socket.on('error', reject);
      this.socket.once('data', () => {
        /* greeting */
      });
    });
  }

  command(cmd, { acceptNo = false } = {}) {
    return new Promise((resolve, reject) => {
      const tag = this.nextTag();
      let pending = '';
      const onData = (chunk) => {
        pending += chunk;
        const lines = pending.split('\r\n');
        pending = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith(`${tag} OK`)) {
            cleanup();
            resolve(pending);
            return;
          }
          if (line.startsWith(`${tag} NO`) || line.startsWith(`${tag} BAD`)) {
            cleanup();
            if (acceptNo) resolve('');
            else reject(new Error(line.slice(0, 180)));
            return;
          }
        }
      };
      const cleanup = () => {
        this.socket.removeListener('data', onData);
      };
      this.socket.on('data', onData);
      this.socket.write(`${tag} ${cmd}\r\n`);
    });
  }

  async login() {
    const user = this.email.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const pass = this.password.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    await this.command(`LOGIN "${user}" "${pass}"`);
  }

  async selectInbox() {
    await this.command('SELECT INBOX');
  }

  async searchRecentTo(targetEmail, maxAgeMinutes = 30) {
    const since = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sinceStr = `${since.getDate()}-${months[since.getMonth()]}-${since.getFullYear()}`;
    const local = String(targetEmail).split('@')[0].replace(/[+]/g, '*');
    const queries = [
      `SEARCH SINCE ${sinceStr} HEADER To "${targetEmail}"`,
      `SEARCH SINCE ${sinceStr} TEXT "verify-email"`,
      `SEARCH SINCE ${sinceStr} SUBJECT "JobbingTrack"`,
      `SEARCH SINCE ${sinceStr} TEXT "${local}"`,
    ];
    for (const q of queries) {
      try {
        const resp = await this.command(q, { acceptNo: true });
        const match = resp.match(/\* SEARCH(?: (.+))?/);
        const ids = match && match[1] ? match[1].trim().split(/\s+/).filter(Boolean) : [];
        if (ids.length) return ids[ids.length - 1];
      } catch {
        /* query suivante */
      }
    }
    return null;
  }

  async fetchBody(uid) {
    const resp = await this.command(`FETCH ${uid} (BODY.PEEK[])`);
    const start = resp.indexOf('BODY[] {');
    if (start === -1) return resp;
    const sizeMatch = resp.slice(start).match(/BODY\[\] \{(\d+)\}\r\n/);
    if (!sizeMatch) return resp;
    const size = Number(sizeMatch[1]);
    const bodyStart = resp.indexOf(sizeMatch[0]) + sizeMatch[0].length;
    return resp.slice(bodyStart, bodyStart + size);
  }

  close() {
    if (this.socket && !this.socket.destroyed) {
      try {
        this.socket.write(`${this.nextTag()} LOGOUT\r\n`);
      } catch {
        /* ignore */
      }
      this.socket.destroy();
    }
  }
}

async function fetchVerificationFromImap(mailbox, targetEmail, { timeoutMs = 45000, pollMs = 4000 } = {}) {
  if (!mailbox?.host || !mailbox.email || !mailbox.password) return null;
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  while (Date.now() < deadline) {
    const session = new ImapSession(mailbox);
    try {
      await session.connect();
      await session.login();
      await session.selectInbox();
      const uid = await session.searchRecentTo(targetEmail);
      if (uid) {
        const body = await session.fetchBody(uid);
        const token = extractTokenFromText(body);
        session.close();
        if (token) {
          return { token, source: `imap:${mailbox.email}`, mailbox: mailbox.email };
        }
      }
      session.close();
    } catch (err) {
      lastErr = err;
      session.close();
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  if (lastErr) throw lastErr;
  return null;
}

async function waitForImapVerificationToken(targetEmail, cfg, opts = {}) {
  const order = [];
  if (cfg.gmailImap) order.push(cfg.gmailImap);
  if (cfg.ovhImap) order.push(cfg.ovhImap);
  if (!order.length) return null;

  let lastErr;
  for (const mailbox of order) {
    try {
      const hit = await fetchVerificationFromImap(mailbox, targetEmail, opts);
      if (hit) return hit;
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

module.exports = {
  fetchVerificationFromImap,
  waitForImapVerificationToken,
  ImapSession,
};
