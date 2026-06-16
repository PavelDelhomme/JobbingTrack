const {
  resolveConnectionSource,
  resolveContainerLabel,
  bucketConnectionCorrelation,
} = require('../src/utils/connectionSource');

describe('connectionSource', () => {
  it('remplace host-network par une lecture destination explicite', () => {
    const resolved = resolveConnectionSource({
      remoteIp: '198.51.100.42',
      localIp: '172.19.0.8',
      localPort: 3017,
      remotePort: 54321,
      protocol: 'TCP',
      containerName: 'jobbingtrack-security-service',
    });

    expect(resolved.source.label).toBe('IP publique');
    expect(resolved.destination.label).toBe('jobbingtrack-security-service');
    expect(resolveContainerLabel({ localIp: '172.19.0.8' })).toBe(
      'Interface Docker / privée',
    );
  });

  it('classe 0.0.0.0 comme port éphémère', () => {
    const resolved = resolveConnectionSource({
      remoteIp: '0.0.0.0',
      localPort: 3000,
      protocol: 'TCP',
    });

    expect(resolved.source.kind).toBe('ephemeral');
    expect(resolved.source.label).toBe('Port éphémère');
  });

  it('résout containerName unknown via hint port local', () => {
    const resolved = resolveConnectionSource({
      remoteIp: '172.19.0.3',
      localIp: '172.19.0.8',
      localPort: 3017,
      remotePort: 3001,
      containerName: 'unknown',
      protocol: 'TCP',
    });

    expect(resolved.destination.kind).toBe('service-hint');
    expect(resolved.destination.label).toBe('security-service (3017)');
    expect(resolved.source.detail).toContain('Client interne');
    expect(resolved.source.detail).toContain('auth-service');
  });

  it('bucketise la corrélation conteneur', () => {
    expect(
      bucketConnectionCorrelation({
        containerName: 'jobbingtrack-api-gateway',
      }),
    ).toBe('dockerNamed');
    expect(bucketConnectionCorrelation({ localIp: '127.0.0.1' })).toBe(
      'hostLayer',
    );
    expect(bucketConnectionCorrelation({ localPort: 9999 })).toBe('unmapped');
  });
});
