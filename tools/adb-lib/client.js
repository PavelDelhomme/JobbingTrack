/**
 * AdbClient – Client Node.js pour interagir avec un appareil Android
 * via l'emulator-controller (tools/emulator-controller/server.js).
 *
 * Usage:
 *   const { createAdb } = require('./client');
 *   const adb = await createAdb();          // auto-detect device
 *   const adb = createAdb('R5CT7263YJL');   // device specifique
 *   await adb.tap('Se connecter');
 *   await adb.typeInField('Email', 'admin@jobbingtrack.test');
 */

const CONTROLLER_URL = process.env.EMULATOR_CONTROLLER_URL || 'http://localhost:5055';

class AdbClient {
  /**
   * @param {string} deviceId
   * @param {object} [opts]
   * @param {string} [opts.controllerUrl]
   * @param {(msg: string) => void} [opts.log]
   */
  constructor(deviceId, opts = {}) {
    this.deviceId = deviceId;
    this.baseUrl = (opts.controllerUrl || CONTROLLER_URL).replace(/\/$/, '');
    this._log = opts.log || ((msg) => console.log(`  [adb] ${msg}`));
  }

  // ─── HTTP helpers ──────────────────────────────────────────────

  async _post(path, body = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: this.deviceId, ...body }),
    });
    return res.json();
  }

  async _get(path) {
    const res = await fetch(`${this.baseUrl}${path}`);
    return res.json();
  }

  // ─── Tap ───────────────────────────────────────────────────────

  /** Tap un element par son texte visible ou content-desc */
  async tap(text, index = 0) {
    const r = await this._post('/find-and-tap', { text, index });
    if (!r.success) throw new Error(r.error || `"${text}" introuvable`);
    this._log(`tap "${text}" -> ${r.message}`);
    return r.message;
  }

  /** Tap un onglet de la bottom bar (1-based) */
  async tapTab(n) {
    return this.tap(`Tab ${n} of`);
  }

  /** Tap a des coordonnees brutes */
  async tapXY(x, y) {
    await this._post('/input-tap', { x, y });
    this._log(`tap (${x},${y})`);
  }

  // ─── Text input ────────────────────────────────────────────────

  /** Trouve un champ par hint, le tape, le vide, et saisit du texte */
  async typeInField(hint, value) {
    const r = await this._post('/tap-field-and-type', { hint, text: value });
    if (!r.success) throw new Error(r.error || `Champ "${hint}" introuvable`);
    this._log(`type "${hint}" = "${value}"`);
    return r.message;
  }

  /** Saisit du texte brut (le champ doit etre deja focus) */
  async typeText(text) {
    await this._post('/input-text', { text });
  }

  // ─── Keys ──────────────────────────────────────────────────────

  async keyevent(code) { await this._post('/input-keyevent', { keycode: code }); }
  async back()    { await this.keyevent(4);   this._log('BACK'); }
  async home()    { await this.keyevent(3);   this._log('HOME'); }
  async enter()   { await this.keyevent(66);  this._log('ENTER'); }
  async tab()     { await this.keyevent(61); }
  async del()     { await this.keyevent(67); }

  async closeKeyboard() { await this.back(); }

  // ─── Gestures ──────────────────────────────────────────────────

  async swipe(x1, y1, x2, y2, duration = 300) {
    await this._post('/input-swipe', { x1, y1, x2, y2, duration });
    this._log(`swipe (${x1},${y1})->(${x2},${y2})`);
  }

  async scrollDown(amount = 800) {
    await this.swipe(540, 1600, 540, 1600 - amount, 500);
  }

  async scrollUp(amount = 800) {
    await this.swipe(540, 600, 540, 600 + amount, 500);
  }

  async openDrawer() {
    await this.swipe(5, 1170, 900, 1170, 350);
    this._log('drawer ouvert');
  }

  async drawerScrollDown() {
    await this.swipe(400, 1800, 400, 800, 400);
  }

  // ─── UI inspection ─────────────────────────────────────────────

  /** Dump le XML complet de l'UI */
  async uiDump() {
    const r = await this._post('/ui-dump', {});
    return r.xml || '';
  }

  /** Verifie si un texte est present a l'ecran */
  async uiContains(text) {
    const xml = await this.uiDump();
    return xml.toLowerCase().includes(text.toLowerCase());
  }

  /** Parse tous les noeuds UI visibles */
  async uiNodes() {
    const xml = await this.uiDump();
    const nodes = [];
    const re = /<node[^>]*>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const n = m[0];
      const a = (attr) => { const x = n.match(new RegExp(`${attr}="([^"]*)"`)); return x ? x[1] : ''; };
      nodes.push({
        text: a('text'),
        contentDesc: a('content-desc'),
        className: a('class'),
        bounds: a('bounds'),
        resourceId: a('resource-id'),
        clickable: /clickable="true"/.test(n),
      });
    }
    return nodes;
  }

  /** Trouve un element par texte ou content-desc */
  async findElement(text) {
    const nodes = await this.uiNodes();
    const t = text.toLowerCase();
    return nodes.find(n =>
      n.text.toLowerCase().includes(t) || n.contentDesc.toLowerCase().includes(t)
    ) || null;
  }

  /** Attend qu'un texte apparaisse (polling) */
  async waitFor(text, timeoutMs = 30000, pollMs = 3000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (await this.uiContains(text)) return true;
      await this.wait(pollMs);
    }
    return false;
  }

  /** Asserte qu'un texte est present, sinon throw */
  async assertVisible(text) {
    const found = await this.uiContains(text);
    if (!found) throw new Error(`Assertion failed: "${text}" not visible`);
    this._log(`assert OK: "${text}" visible`);
  }

  /** Asserte qu'un texte est absent */
  async assertNotVisible(text) {
    const found = await this.uiContains(text);
    if (found) throw new Error(`Assertion failed: "${text}" should not be visible`);
    this._log(`assert OK: "${text}" absent`);
  }

  // ─── Screen ────────────────────────────────────────────────────

  async screenInfo() {
    return this._post('/screen-info', {});
  }

  screenshotUrl() {
    return `${this.baseUrl}/screenshot?device=${encodeURIComponent(this.deviceId)}&t=${Date.now()}`;
  }

  // ─── Extended ──────────────────────────────────────────────────

  async swipeRight() {
    await this.swipe(5, 1170, 900, 1170, 350);
    this._log('swipe right (open drawer)');
  }

  async swipeLeft(y = 1170) {
    await this.swipe(900, y, 100, y, 300);
    this._log('swipe left');
  }

  async shellCommand(command) {
    const r = await this._post('/adb-shell', { command });
    if (!r.success) throw new Error(r.error || 'Shell command failed');
    this._log(`shell: ${command.substring(0, 60)}`);
    return r.stdout || '';
  }

  async tapByIndex(index) {
    const nodes = await this.uiNodes();
    const clickable = nodes.filter(n => n.clickable && (n.text || n.contentDesc));
    if (index >= clickable.length) throw new Error(`Index ${index} hors limites (${clickable.length} elements)`);
    const node = clickable[index];
    const m = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!m) throw new Error(`Bounds invalides: ${node.bounds}`);
    const x = Math.round((parseInt(m[1]) + parseInt(m[3])) / 2);
    const y = Math.round((parseInt(m[2]) + parseInt(m[4])) / 2);
    await this.tapCoords(x, y);
    this._log(`tap index ${index}: "${node.text || node.contentDesc}" (${x},${y})`);
    return node.text || node.contentDesc;
  }

  async openGmail() {
    return this.shellCommand('am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n com.google.android.gm/.ConversationListActivityGmail');
  }

  async openEmailApp() {
    try {
      return await this.shellCommand('am start -a android.intent.action.MAIN -t "message/rfc822"');
    } catch {
      return this.openGmail();
    }
  }

  async returnToApp(packageName = 'com.example.jobbingtrack_mobile') {
    try {
      return await this.shellCommand(`am start -n ${packageName}/.MainActivity`);
    } catch {
      await this.back();
      await this.wait(500);
      await this.back();
      return 'Retour via back';
    }
  }

  // ─── Utilities ─────────────────────────────────────────────────

  wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  async clearField() {
    await this._post('/clear-field', {});
  }

  // ─── Healthcheck & devices ─────────────────────────────────────

  async health() {
    try { const r = await this._get('/health'); return !!r.ok; } catch { return false; }
  }

  async listDevices() {
    const r = await this._get('/devices');
    return r.devices || [];
  }
}

/**
 * Factory : cree un AdbClient. Si pas de deviceId, auto-detecte le premier appareil.
 * @param {string} [deviceId]
 * @param {object} [opts]
 * @returns {Promise<AdbClient>}
 */
async function createAdb(deviceId, opts = {}) {
  if (!deviceId) {
    const tmp = new AdbClient('_probe_', opts);
    const devs = await tmp.listDevices();
    if (devs.length === 0) throw new Error('Aucun appareil ADB detecte');
    deviceId = devs[0].id;
    console.log(`[adb-lib] Appareil auto-detecte: ${deviceId}`);
  }
  return new AdbClient(deviceId, opts);
}

module.exports = { AdbClient, createAdb };
