/**
 * Helpers pour les tests E2E utilisant MailHog (capture emails dev/test).
 * MailHog doit être démarré (profil full ou mail) : http://localhost:8025
 */

const MAILHOG_BASE = process.env.MAILHOG_WEB_URL || 'http://localhost:8025';

export interface MailHogMessage {
  ID?: string;
  id?: string;
  From?: { Mailbox?: string; Domain?: string };
  from?: { mailbox?: string; domain?: string };
  To?: Array<{ Mailbox?: string; Domain?: string }>;
  to?: Array<{ mailbox?: string; domain?: string }>;
  Content?: { Body?: string };
  content?: { body?: string };
  MIME?: { Parts?: Array<{ Body?: string; Headers?: Record<string, string[]> }> };
}

/**
 * Vérifie que MailHog répond (pour skip des tests si non disponible).
 */
export async function isMailHogAvailable(): Promise<boolean> {
  try {
    const r = await fetch(`${MAILHOG_BASE}/api/v2/messages?limit=1`, {
      signal: AbortSignal.timeout(3000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Récupère la liste des messages (API v2).
 */
export async function getMessages(limit = 10): Promise<{ total: number; messages: Array<{ id: string }> }> {
  const r = await fetch(`${MAILHOG_BASE}/api/v2/messages?limit=${limit}`);
  if (!r.ok) throw new Error(`MailHog API error: ${r.status}`);
  const data = await r.json();
  return { total: data.total ?? 0, messages: data.messages ?? [] };
}

/**
 * Récupère un message complet par ID (API v1 pour le corps).
 */
export async function getMessageById(id: string): Promise<MailHogMessage | null> {
  const r = await fetch(`${MAILHOG_BASE}/api/v1/messages/${id}`);
  if (!r.ok) return null;
  return r.json();
}

/**
 * Attend qu'au moins un nouveau message arrive (après un envoi).
 */
export async function waitForLatestMessage(
  previousCount: number,
  options: { timeoutMs?: number; pollMs?: number } = {}
): Promise<{ id: string } | null> {
  const { timeoutMs = 15000, pollMs = 500 } = options;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { total, messages } = await getMessages(1);
    if (total > previousCount && messages.length > 0) return messages[0];
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return null;
}

/**
 * Extrait les URLs (liens href) du corps HTML d'un message MailHog.
 * Gère le format API v1 (Content.Parts ou Body).
 */
export function extractLinksFromMessage(message: MailHogMessage): string[] {
  const links: string[] = [];
  const extractFromHtml = (html: string) => {
    if (!html || typeof html !== 'string') return;
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = hrefRegex.exec(html)) !== null) links.push(m[1]);
  };

  const body = message.Content?.Body ?? message.content?.body;
  if (body) extractFromHtml(body);
  const parts = message.MIME?.Parts ?? [];
  for (const part of parts) {
    if (part.Body) extractFromHtml(part.Body);
  }
  return [...new Set(links)];
}
