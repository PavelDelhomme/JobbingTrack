/**
 * Tests unitaires de base (pattern "unit" pour npm run test:unit).
 * Vérifications simples pour que la suite unit trouve au moins un test.
 */

describe('Unit sample', () => {
  it('calcule 1 + 1', () => {
    expect(1 + 1).toBe(2)
  })

  it('concatène des chaînes', () => {
    expect('hello' + ' ' + 'world').toBe('hello world')
  })

  it('vérifie un tableau', () => {
    const arr = [1, 2, 3]
    expect(arr).toHaveLength(3)
    expect(arr).toContain(2)
  })
})
