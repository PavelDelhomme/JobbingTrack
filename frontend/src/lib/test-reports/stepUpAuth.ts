import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const STEP_UP_TTL_MS = 5 * 60 * 1000;

interface StepUpSession {
  userId: string;
  reportId: string;
  expiresAt: number;
  used: boolean;
}

const sessions = new Map<string, StepUpSession>();

function getSecret(): string {
  const secret =
    process.env.STEP_UP_TOKEN_SECRET?.trim() ||
    process.env.METRICS_API_KEY?.trim();
  if (!secret) {
    throw new Error("STEP_UP_TOKEN_SECRET ou METRICS_API_KEY requis");
  }
  return secret;
}

export interface JwtPayloadMinimal {
  sub?: string;
  userId?: string;
  email?: string;
  role?: string;
  exp?: number;
}

export function decodeJwtPayload(token: string): JwtPayloadMinimal | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as JwtPayloadMinimal;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function isElevatedAdmin(role?: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function issueStepUpToken(userId: string, reportId: string): string {
  const expiresAt = Date.now() + STEP_UP_TTL_MS;
  const nonce = randomBytes(12).toString("hex");
  const payload = `${userId}|${reportId}|${expiresAt}|${nonce}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  const token = Buffer.from(`${payload}|${sig}`).toString("base64url");
  sessions.set(token, { userId, reportId, expiresAt, used: false });
  return token;
}

export function consumeStepUpToken(
  token: string,
  userId: string,
  reportId: string,
): boolean {
  const session = sessions.get(token);
  if (!session) return false;
  if (session.used) return false;
  if (session.userId !== userId || session.reportId !== reportId) return false;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return false;
  }

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastPipe = decoded.lastIndexOf("|");
    if (lastPipe < 0) return false;
    const sig = decoded.slice(lastPipe + 1);
    const payload = decoded.slice(0, lastPipe);
    const expected = createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }
  } catch {
    return false;
  }

  session.used = true;
  sessions.delete(token);
  return true;
}

export function stepUpTtlSeconds(): number {
  return Math.floor(STEP_UP_TTL_MS / 1000);
}
