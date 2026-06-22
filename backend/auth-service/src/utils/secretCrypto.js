const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;

function resolveKey() {
  const raw = process.env.EMAIL_AGENT_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
  if (!raw || raw.length < 16) {
    throw new Error('EMAIL_AGENT_ENCRYPTION_KEY manquant ou trop court');
  }
  return crypto.createHash('sha256').update(String(raw)).digest();
}

function encryptSecret(plainObject) {
  const key = resolveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const json = JSON.stringify(plainObject);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptSecret(payload) {
  const key = resolveKey();
  const buf = Buffer.from(String(payload), 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
  const data = buf.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  return JSON.parse(decrypted);
}

module.exports = {
  encryptSecret,
  decryptSecret,
};
