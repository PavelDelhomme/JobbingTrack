/**
 * Client ADB reutilisable pour interagir avec un appareil Android via l'emulator-controller.
 * Toutes les interactions passent par le serveur Node.js (tools/emulator-controller/server.js).
 */

export interface AdbTapResult {
  success: boolean;
  message?: string;
  bounds?: string;
  clickable?: boolean;
  error?: string;
}

export interface AdbTypeResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AdbUiNode {
  text: string;
  contentDesc: string;
  className: string;
  bounds: string;
  resourceId: string;
  clickable?: boolean;
}

export interface AdbUiDumpResult {
  xml: string;
  nodes?: AdbUiNode[];
}

export interface AdbScreenInfo {
  width: number;
  height: number;
}

export type LogFn = (msg: string) => void;

export class AdbClient {
  private baseUrl: string;
  private deviceId: string;
  private log: LogFn;
  /** Signal d'annulation (runner) — quand aborted, les fetch en cours lèvent. */
  private abortSignal: AbortSignal | null = null;
  /** Timeout des requêtes (ms) pour éviter blocage infini (ex: ui-dump lent). */
  private requestTimeoutMs = 60000;

  constructor(controllerUrl: string, deviceId: string, log?: LogFn) {
    this.baseUrl = controllerUrl.replace(/\/$/, "");
    this.deviceId = deviceId;
    this.log = log || (() => {});
  }

  /** À appeler par le runner : annule les requêtes en cours quand l'utilisateur clique Annuler. */
  setAbortSignal(signal: AbortSignal | null): void {
    this.abortSignal = signal;
  }

  get device() {
    return this.deviceId;
  }

  private getFetchSignal(): AbortSignal {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), this.requestTimeoutMs);
    if (this.abortSignal) {
      this.abortSignal.addEventListener("abort", () => {
        clearTimeout(tid);
        ctrl.abort();
      });
    }
    return ctrl.signal;
  }

  private isNetworkError(e: unknown): boolean {
    if (
      e instanceof TypeError &&
      (e.message === "Failed to fetch" || e.message?.includes("fetch"))
    )
      return true;
    if (
      e instanceof Error &&
      "name" in e &&
      (e as DOMException).name === "NetworkError"
    )
      return true;
    return false;
  }

  private async post<T = any>(
    path: string,
    body: Record<string, any>,
  ): Promise<T> {
    const maxRetries = 2;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${this.baseUrl}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: this.deviceId, ...body }),
          signal: this.getFetchSignal(),
        });
        return await res.json();
      } catch (e) {
        lastErr = e;
        if (attempt < maxRetries && this.isNetworkError(e)) {
          this.log(
            `NetworkError, retry ${attempt + 1}/${maxRetries} dans 2s...`,
          );
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        throw e;
      }
    }
    throw lastErr;
  }

  private async getWithRetry<T = any>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const maxRetries = 2;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const url = new URL(`${this.baseUrl}${path}`);
        if (params)
          Object.entries(params).forEach(([k, v]) =>
            url.searchParams.set(k, v),
          );
        const res = await fetch(url.toString(), {
          signal: this.getFetchSignal(),
        });
        return await res.json();
      } catch (e) {
        lastErr = e;
        if (attempt < maxRetries && this.isNetworkError(e)) {
          this.log(
            `NetworkError GET, retry ${attempt + 1}/${maxRetries} dans 2s...`,
          );
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        throw e;
      }
    }
    throw lastErr;
  }

  private async get<T = any>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    return this.getWithRetry<T>(path, params);
  }

  // ─── Actions elementaires ──────────────────────────────────────

  async tap(text: string, index = 0): Promise<string> {
    const r = await this.post<AdbTapResult>("/find-and-tap", { text, index });
    if (!r.success) throw new Error(r.error || `Element "${text}" introuvable`);
    this.log(`tap "${text}" -> ${r.message}`);
    return r.message || "";
  }

  async tapCoords(x: number, y: number): Promise<void> {
    await this.post("/input-tap", { x, y });
    this.log(`tap (${x}, ${y})`);
  }

  async typeInField(hint: string, value: string, index = 0): Promise<string> {
    const r = await this.post<AdbTypeResult>("/tap-field-and-type", {
      hint,
      text: value,
      index,
    });
    if (!r.success) throw new Error(r.error || `Champ "${hint}" introuvable`);
    this.log(
      `type "${hint}" = "${value.slice(0, 20)}${value.length > 20 ? "..." : ""}"`,
    );
    return r.message || "";
  }

  async typeText(text: string): Promise<void> {
    await this.post("/input-text", { text });
    this.log(`text "${text.slice(0, 30)}"`);
  }

  async keyevent(code: number): Promise<void> {
    await this.post("/input-keyevent", { keycode: code });
  }

  async back(): Promise<void> {
    await this.keyevent(4);
    this.log("key BACK");
  }

  async home(): Promise<void> {
    await this.keyevent(3);
    this.log("key HOME");
  }

  async enter(): Promise<void> {
    await this.keyevent(66);
    this.log("key ENTER");
  }

  async swipe(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    duration = 300,
  ): Promise<void> {
    await this.post("/input-swipe", { x1, y1, x2, y2, duration });
    this.log(`swipe (${x1},${y1})->(${x2},${y2}) ${duration}ms`);
  }

  async scrollDown(amount = 800): Promise<void> {
    await this.swipe(540, 1600, 540, 1600 - amount, 500);
  }

  async scrollUp(amount = 800): Promise<void> {
    await this.swipe(540, 600, 540, 600 + amount, 500);
  }

  // ─── Inspection UI ─────────────────────────────────────────────

  async uiDump(): Promise<string> {
    const r = await this.post<AdbUiDumpResult>("/ui-dump", {});
    return r.xml || "";
  }

  async uiContains(text: string): Promise<boolean> {
    const xml = await this.uiDump();
    return xml.toLowerCase().includes(text.toLowerCase());
  }

  /** Résumé des textes visibles (pour logs de diagnostic). */
  async getScreenSummary(maxItems = 14): Promise<string> {
    const nodes = await this.uiNodes();
    const items: string[] = [];
    for (const n of nodes) {
      if (n.text?.trim()) items.push(n.text.trim().slice(0, 50));
      if (n.contentDesc?.trim() && n.contentDesc !== n.text)
        items.push(n.contentDesc.trim().slice(0, 50));
    }
    const unique = Array.from(new Set(items))
      .filter(Boolean)
      .slice(0, maxItems);
    return unique.join(" | ") || "(aucun texte)";
  }

  /** Log le résumé de l'écran actuel (champs / titres visibles) pour diagnostic. */
  async logScreenSummary(prefix = "Écran"): Promise<void> {
    try {
      const summary = await this.getScreenSummary();
      this.log(`[${prefix}] ${summary}`);
    } catch (e) {
      this.log(
        `[${prefix}] (dump échoué: ${e instanceof Error ? e.message : String(e)})`,
      );
    }
  }

  /** Envoie un message dans le log du runner (pour diagnostic depuis les steps). */
  logMessage(msg: string): void {
    this.log(msg);
  }

  async uiNodes(): Promise<AdbUiNode[]> {
    const xml = await this.uiDump();
    const nodes: AdbUiNode[] = [];
    const re = /<node[^>]*>/g;
    let match;
    while ((match = re.exec(xml)) !== null) {
      const n = match[0];
      const attr = (a: string) => {
        const m = n.match(new RegExp(`${a}="([^"]*)"`));
        return m ? m[1] : "";
      };
      nodes.push({
        text: attr("text"),
        contentDesc: attr("content-desc"),
        className: attr("class"),
        bounds: attr("bounds"),
        resourceId: attr("resource-id"),
        clickable: /clickable="true"/.test(n),
      });
    }
    return nodes;
  }

  async findElement(text: string): Promise<AdbUiNode | null> {
    const nodes = await this.uiNodes();
    const t = text.toLowerCase();
    return (
      nodes.find(
        (n) =>
          n.text.toLowerCase().includes(t) ||
          n.contentDesc.toLowerCase().includes(t),
      ) || null
    );
  }

  async waitForElement(
    text: string,
    timeoutMs = 30000,
    pollMs = 3000,
  ): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.uiContains(text)) return true;
      await this.wait(pollMs);
    }
    return false;
  }

  // ─── Ecran ─────────────────────────────────────────────────────

  async screenInfo(): Promise<AdbScreenInfo> {
    return this.post<AdbScreenInfo>("/screen-info", {});
  }

  screenshotUrl(cacheBust?: number): string {
    const t = cacheBust || Date.now();
    return `${this.baseUrl}/screenshot?device=${encodeURIComponent(this.deviceId)}&t=${t}`;
  }

  // ─── Utilitaires ───────────────────────────────────────────────

  wait(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  async clearField(): Promise<void> {
    await this.post("/clear-field", {});
  }

  // ─── Navigation Flutter (onglets bottom bar) ───────────────────

  async tapTab(tabNumber: number): Promise<string> {
    return this.tap(`Tab ${tabNumber} of`);
  }

  async openDrawer(): Promise<void> {
    await this.swipe(5, 1170, 900, 1170, 350);
    this.log("drawer ouvert");
  }

  async drawerScrollDown(): Promise<void> {
    await this.swipe(400, 1800, 400, 800, 400);
  }

  async closeKeyboard(): Promise<void> {
    await this.keyevent(4);
  }

  async swipeRight(): Promise<void> {
    await this.swipe(5, 1170, 900, 1170, 350);
    this.log("swipe right (open drawer)");
  }

  async swipeLeft(y = 1170): Promise<void> {
    await this.swipe(900, y, 100, y, 300);
    this.log("swipe left");
  }

  async shellCommand(command: string): Promise<string> {
    const r = await this.post<{
      success: boolean;
      stdout?: string;
      error?: string;
    }>("/adb-shell", { command });
    if (!r.success) throw new Error(r.error || "Shell command failed");
    this.log(`shell: ${command.substring(0, 60)}`);
    return r.stdout || "";
  }

  async tapByIndex(index: number): Promise<string> {
    const nodes = await this.uiNodes();
    const clickable = nodes.filter(
      (n) => n.clickable && (n.text || n.contentDesc),
    );
    if (index >= clickable.length)
      throw new Error(
        `Index ${index} hors limites (${clickable.length} elements cliquables)`,
      );
    const node = clickable[index];
    const boundsMatch = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!boundsMatch) throw new Error(`Bounds invalides: ${node.bounds}`);
    const x = Math.round(
      (parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2,
    );
    const y = Math.round(
      (parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2,
    );
    await this.tapCoords(x, y);
    this.log(
      `tap index ${index}: "${node.text || node.contentDesc}" (${x},${y})`,
    );
    return node.text || node.contentDesc;
  }

  // ─── Healthcheck ───────────────────────────────────────────────

  async health(): Promise<boolean> {
    try {
      const r = await this.get<{ ok?: boolean }>("/health");
      return !!r.ok;
    } catch {
      return false;
    }
  }

  async devices(): Promise<{ id: string; status: string }[]> {
    const r = await this.get<{ devices: { id: string; status: string }[] }>(
      "/devices",
    );
    return r.devices || [];
  }
}
