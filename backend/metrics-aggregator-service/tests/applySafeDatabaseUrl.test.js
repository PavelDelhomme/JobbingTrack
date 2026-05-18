const { applySafeDatabaseUrl } = require('../src/utils/applySafeDatabaseUrl')

describe('applySafeDatabaseUrl', () => {
  const keys = [
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'DATABASE_URL',
    'DATABASE_URL_SKIP_SAFE_REWRITE'
  ]

  let snapshot

  beforeEach(() => {
    snapshot = {}
    for (const k of keys) {
      snapshot[k] = process.env[k]
    }
  })

  afterEach(() => {
    for (const k of keys) {
      if (snapshot[k] === undefined) delete process.env[k]
      else process.env[k] = snapshot[k]
    }
  })

  it('reconstruit DATABASE_URL avec encodage des caractères spéciaux du mot de passe', () => {
    process.env.POSTGRES_USER = 'jobbingtrack'
    process.env.POSTGRES_PASSWORD = 'p@ss:w#rd'
    process.env.POSTGRES_DB = 'jobbingtrack'
    process.env.POSTGRES_HOST = 'postgres'
    process.env.POSTGRES_PORT = '5432'
    process.env.DATABASE_URL =
      'postgresql://jobbingtrack:p@ss:w#rd@postgres:5432/jobbingtrack?schema=public'
    applySafeDatabaseUrl()
    expect(process.env.DATABASE_URL).toBe(
      'postgresql://jobbingtrack:p%40ss%3Aw%23rd@postgres:5432/jobbingtrack?schema=public'
    )
  })

  it('respecte DATABASE_URL_SKIP_SAFE_REWRITE=1', () => {
    const orig = 'postgresql://u:plain@postgres:5432/db?schema=public'
    process.env.POSTGRES_USER = 'jobbingtrack'
    process.env.POSTGRES_PASSWORD = 'x'
    process.env.POSTGRES_DB = 'jobbingtrack'
    process.env.DATABASE_URL = orig
    process.env.DATABASE_URL_SKIP_SAFE_REWRITE = '1'
    applySafeDatabaseUrl()
    expect(process.env.DATABASE_URL).toBe(orig)
  })
})
