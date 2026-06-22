const tls = require('tls');

class ImapMinimalClient {
  constructor({ host, port, email, password, useTls = true }) {
    this.host = host;
    this.port = port || 993;
    this.email = email;
    this.password = password;
    this.useTls = useTls !== false;
    this.tag = 0;
    this.socket = null;
  }

  nextTag() {
    this.tag += 1;
    return `A${this.tag}`;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.useTls) {
        this.socket = tls.connect(
          { host: this.host, port: this.port, servername: this.host, rejectUnauthorized: true },
          () => resolve(),
        );
      } else {
        const net = require('net');
        this.socket = net.connect({ host: this.host, port: this.port }, () => resolve());
      }
      this.socket.setEncoding('utf8');
      this.socket.on('error', reject);
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
            else reject(new Error(line.slice(0, 200)));
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

  async searchRecent(maxCount = 20) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const sinceStr = `${since.getDate()}-${months[since.getMonth()]}-${since.getFullYear()}`;
    const resp = await this.command(`SEARCH SINCE ${sinceStr}`, { acceptNo: true });
    const match = resp.match(/\* SEARCH(?: (.+))?/);
    const ids = match && match[1] ? match[1].trim().split(/\s+/).filter(Boolean) : [];
    return ids.slice(-maxCount);
  }

  async fetchHeaders(uid) {
    const resp = await this.command(`FETCH ${uid} (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID)])`);
    const fromMatch = resp.match(/From: ([^\r\n]+)/i);
    const subjectMatch = resp.match(/Subject: ([^\r\n]+)/i);
    const dateMatch = resp.match(/Date: ([^\r\n]+)/i);
    const messageIdMatch = resp.match(/Message-ID: ([^\r\n]+)/i);
    return {
      externalId: messageIdMatch ? messageIdMatch[1].trim() : `uid-${uid}`,
      fromAddress: fromMatch ? fromMatch[1].trim() : '',
      subject: subjectMatch ? subjectMatch[1].trim() : '(sans objet)',
      receivedAt: dateMatch ? new Date(dateMatch[1].trim()) : new Date(),
      snippet: '',
    };
  }

  close() {
    if (this.socket) {
      try {
        this.socket.end();
      } catch {
        /* ignore */
      }
    }
  }
}

async function testImapConnection(config) {
  const client = new ImapMinimalClient(config);
  await client.connect();
  await client.login();
  await client.selectInbox();
  client.close();
  return { ok: true };
}

async function fetchRecentImapMessages(config, maxCount = 20) {
  const client = new ImapMinimalClient(config);
  await client.connect();
  await client.login();
  await client.selectInbox();
  const ids = await client.searchRecent(maxCount);
  const messages = [];
  for (const uid of ids) {
    try {
      messages.push(await client.fetchHeaders(uid));
    } catch {
      /* skip message */
    }
  }
  client.close();
  return messages;
}

module.exports = {
  ImapMinimalClient,
  testImapConnection,
  fetchRecentImapMessages,
};
