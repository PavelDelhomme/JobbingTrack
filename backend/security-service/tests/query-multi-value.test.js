const {
  parseQueryMultiValue,
  buildUpperInFilter,
  buildInsensitiveContainsFilter,
  buildIntInFilter,
} = require('../src/utils/queryMultiValue');

describe('queryMultiValue', () => {
  test('parseQueryMultiValue déduplique et normalise', () => {
    expect(parseQueryMultiValue('HIGH, critical;HIGH')).toEqual(['HIGH', 'critical']);
    expect(parseQueryMultiValue(['PORT_SCAN', 'DDOS'])).toEqual(['PORT_SCAN', 'DDOS']);
    expect(parseQueryMultiValue('')).toEqual([]);
  });

  test('buildUpperInFilter gère une ou plusieurs valeurs', () => {
    expect(buildUpperInFilter(['high'])).toBe('HIGH');
    expect(buildUpperInFilter(['high', 'critical'])).toEqual({
      in: ['HIGH', 'CRITICAL'],
    });
  });

  test('buildInsensitiveContainsFilter gère plusieurs tokens', () => {
    expect(buildInsensitiveContainsFilter(['203.0.113'])).toEqual({
      contains: '203.0.113',
      mode: 'insensitive',
    });
    expect(buildInsensitiveContainsFilter(['10.0.0.1', '198.51'])).toEqual({
      OR: [
        { contains: '10.0.0.1', mode: 'insensitive' },
        { contains: '198.51', mode: 'insensitive' },
      ],
    });
  });

  test('buildIntInFilter ignore les ports invalides', () => {
    expect(buildIntInFilter(['443', '80'])).toEqual({ in: [443, 80] });
    expect(buildIntInFilter(['abc'])).toBeUndefined();
  });
});
