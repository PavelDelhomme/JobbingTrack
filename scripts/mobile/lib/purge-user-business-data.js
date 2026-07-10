/**
 * Purge métier ciblée par email — via PostgreSQL (docker exec).
 * Rapide même avec 1000+ candidatures ; ne touche pas au compte User.
 * @used-by scripts/mobile/setup/reset-porteur-validation-data.js
 */

const { execFileSync } = require('child_process');

const POSTGRES_CONTAINER = process.env.POSTGRES_CONTAINER || 'jobbingtrack-postgres';

function sqlQuery(sql) {
  return execFileSync(
    'docker',
    [
      'exec',
      POSTGRES_CONTAINER,
      'psql',
      '-U',
      'jobbingtrack',
      '-d',
      'jobbingtrack',
      '-t',
      '-A',
      '-c',
      sql,
    ],
    { encoding: 'utf8' },
  ).trim();
}

function sqlEscape(value) {
  return String(value).replace(/'/g, "''");
}

function parseCount(raw, label) {
  const n = Number.parseInt(String(raw).trim(), 10);
  if (Number.isNaN(n)) {
    throw new Error(`Comptage ${label} illisible : ${raw}`);
  }
  return n;
}

function getUserId(email) {
  const safe = sqlEscape(email.trim().toLowerCase());
  const id = sqlQuery(`SELECT id FROM "User" WHERE lower(email) = lower('${safe}') LIMIT 1;`);
  if (!id) throw new Error(`Utilisateur introuvable : ${email}`);
  return id;
}

function auditUserBusinessData(userId) {
  const safeId = sqlEscape(userId);
  const q = (table) =>
    parseCount(
      sqlQuery(`SELECT COUNT(*) FROM "${table}" WHERE "userId" = '${safeId}';`),
      table,
    );

  return {
    applications: q('Application'),
    companies: q('Company'),
    contacts: q('Contact'),
    interviews: q('Interview'),
    followUps: q('FollowUp'),
    calls: q('Call'),
    events: q('Event'),
    notifications: q('Notification'),
    documents: q('Document'),
  };
}

function runDelete(label, sql) {
  const out = sqlQuery(sql);
  return parseCount(out.split('\n').pop() || out, label);
}

/** IDs entreprise liées aux candidatures de l'utilisateur (capturés avant suppression Application). */
function getExclusiveCompanyIds(userId) {
  const safeId = sqlEscape(userId);
  const raw = sqlQuery(
    `SELECT DISTINCT cid FROM (
      SELECT "companyId" AS cid FROM "Application" WHERE "userId" = '${safeId}' AND "companyId" IS NOT NULL
      UNION
      SELECT "agencyId" AS cid FROM "Application" WHERE "userId" = '${safeId}' AND "agencyId" IS NOT NULL
    ) s WHERE cid IS NOT NULL;`,
  );
  if (!raw) return [];
  return raw.split('\n').map((line) => line.trim()).filter(Boolean);
}

/** Aucune candidature (tous comptes) ne référence cette entreprise. */
const COMPANY_UNREFERENCED_SQL = `NOT EXISTS (
  SELECT 1 FROM "Application" a
  WHERE a."companyId" = c.id OR a."agencyId" = c.id
)`;

/**
 * Supprime toutes les entités métier d'un utilisateur (hard delete SQL).
 */
function purgeUserBusinessData(email, options = {}) {
  const { dryRun = false } = options;
  const userId = getUserId(email);
  const user = { id: userId, email: email.trim() };
  const before = auditUserBusinessData(userId);

  if (dryRun) {
    return { dryRun: true, user, before, deleted: {}, after: before };
  }

  const safeId = sqlEscape(userId);
  const uid = `'${safeId}'`;
  const exclusiveCompanyIds = getExclusiveCompanyIds(userId);
  const deleted = {};

  deleted.applicationStatusHistory = runDelete(
    'ApplicationStatusHistory',
    `WITH d AS (
      DELETE FROM "ApplicationStatusHistory"
      WHERE "applicationId" IN (SELECT id FROM "Application" WHERE "userId" = ${uid})
      RETURNING 1
    ) SELECT COUNT(*) FROM d;`,
  );

  deleted.documents = runDelete(
    'Document',
    `WITH d AS (DELETE FROM "Document" WHERE "userId" = ${uid} RETURNING 1) SELECT COUNT(*) FROM d;`,
  );

  deleted.notifications = runDelete(
    'Notification',
    `WITH d AS (DELETE FROM "Notification" WHERE "userId" = ${uid} RETURNING 1) SELECT COUNT(*) FROM d;`,
  );

  deleted.events = runDelete(
    'Event',
    `WITH d AS (DELETE FROM "Event" WHERE "userId" = ${uid} RETURNING 1) SELECT COUNT(*) FROM d;`,
  );

  deleted.calls = runDelete(
    'Call',
    `WITH d AS (DELETE FROM "Call" WHERE "userId" = ${uid} RETURNING 1) SELECT COUNT(*) FROM d;`,
  );

  deleted.followUpContact = runDelete(
    'FollowUpContact',
    `WITH d AS (
      DELETE FROM "FollowUpContact"
      WHERE "followUpId" IN (SELECT id FROM "FollowUp" WHERE "userId" = ${uid})
      RETURNING 1
    ) SELECT COUNT(*) FROM d;`,
  );

  deleted.followUps = runDelete(
    'FollowUp',
    `WITH d AS (DELETE FROM "FollowUp" WHERE "userId" = ${uid} RETURNING 1) SELECT COUNT(*) FROM d;`,
  );

  deleted.interviewContact = runDelete(
    'InterviewContact',
    `WITH d AS (
      DELETE FROM "InterviewContact"
      WHERE "interviewId" IN (SELECT id FROM "Interview" WHERE "userId" = ${uid})
      RETURNING 1
    ) SELECT COUNT(*) FROM d;`,
  );

  deleted.interviews = runDelete(
    'Interview',
    `WITH d AS (DELETE FROM "Interview" WHERE "userId" = ${uid} RETURNING 1) SELECT COUNT(*) FROM d;`,
  );

  deleted.contactApplication = runDelete(
    'ContactApplication',
    `WITH d AS (
      DELETE FROM "ContactApplication"
      WHERE "contactId" IN (SELECT id FROM "Contact" WHERE "userId" = ${uid})
         OR "applicationId" IN (SELECT id FROM "Application" WHERE "userId" = ${uid})
      RETURNING 1
    ) SELECT COUNT(*) FROM d;`,
  );

  deleted.applications = runDelete(
    'Application',
    `WITH d AS (DELETE FROM "Application" WHERE "userId" = ${uid} RETURNING 1) SELECT COUNT(*) FROM d;`,
  );

  if (exclusiveCompanyIds.length > 0) {
    const idList = exclusiveCompanyIds.map((id) => `'${sqlEscape(id)}'`).join(',');
    deleted.companiesExclusive = runDelete(
      'Company(exclusive)',
      `WITH d AS (
        DELETE FROM "Company" c
        WHERE c.id IN (${idList})
          AND ${COMPANY_UNREFERENCED_SQL}
        RETURNING 1
      ) SELECT COUNT(*) FROM d;`,
    );
  } else {
    deleted.companiesExclusive = 0;
  }

  deleted.contactCompany = runDelete(
    'ContactCompany',
    `WITH d AS (
      DELETE FROM "ContactCompany"
      WHERE "contactId" IN (SELECT id FROM "Contact" WHERE "userId" = ${uid})
      RETURNING 1
    ) SELECT COUNT(*) FROM d;`,
  );

  deleted.contacts = runDelete(
    'Contact',
    `WITH d AS (DELETE FROM "Contact" WHERE "userId" = ${uid} RETURNING 1) SELECT COUNT(*) FROM d;`,
  );

  deleted.companiesOwned = runDelete(
    'Company(owned)',
    `WITH d AS (
      DELETE FROM "Company" c
      WHERE c."userId" = ${uid}
        AND ${COMPANY_UNREFERENCED_SQL}
      RETURNING 1
    ) SELECT COUNT(*) FROM d;`,
  );

  const after = auditUserBusinessData(userId);
  return { user, before, deleted, after };
}

function reassignSeededOwnership(userId) {
  const safeId = sqlEscape(userId);
  const uid = `'${safeId}'`;
  sqlQuery(`
    UPDATE "Company" c SET "userId" = ${uid}
    FROM "Application" a
    WHERE a."companyId" = c.id AND a."userId" = ${uid} AND c."userId" <> ${uid};
  `);
}

module.exports = {
  auditUserBusinessData,
  purgeUserBusinessData,
  reassignSeededOwnership,
  getUserId,
};
