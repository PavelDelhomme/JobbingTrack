/**
 * Docker Compose injecte souvent `DATABASE_URL=postgresql://user:PASSWORD@...` sans
 * encodage URL du mot de passe. Les caractères `@ # : + % &` (etc.) cassent l’URL ou
 * envoient un mauvais mot de passe → `FATAL: password authentication failed` côté Postgres
 * à chaque cycle Prisma (ex. collecte « normal » ~15 s).
 *
 * Quand POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB sont présents dans l’environnement
 * du conteneur, on reconstruit `DATABASE_URL` avec encodeURIComponent (prioritaire sur la
 * valeur interpolée par Compose).
 *
 * Désactiver : `DATABASE_URL_SKIP_SAFE_REWRITE=1`
 */
function applySafeDatabaseUrl () {
  if (process.env.DATABASE_URL_SKIP_SAFE_REWRITE === '1') return

  const user = process.env.POSTGRES_USER
  const password = process.env.POSTGRES_PASSWORD
  const db = process.env.POSTGRES_DB
  if (user === undefined || password === undefined || db === undefined) return

  const host = process.env.POSTGRES_HOST || 'postgres'
  const port = process.env.POSTGRES_PORT || '5432'
  const extra = process.env.POSTGRES_URL_QUERY || 'schema=public'
  const q = extra.startsWith('?') ? extra.slice(1) : extra
  const base = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(db)}`
  process.env.DATABASE_URL = q ? `${base}?${q}` : base
}

module.exports = { applySafeDatabaseUrl }
