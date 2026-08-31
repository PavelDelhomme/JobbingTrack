const {
  buildKnownServicesMap,
  resolveProbeHost,
  resolveStackSlug,
} = require('../src/config/serviceHealthEndpoints');

describe('serviceHealthEndpoints STACK_SLUG', () => {
  const prev = process.env.STACK_SLUG;

  afterEach(() => {
    if (prev === undefined) delete process.env.STACK_SLUG;
    else process.env.STACK_SLUG = prev;
  });

  it('utilise jobbingtrack par défaut (dev local)', () => {
    delete process.env.STACK_SLUG;
    expect(resolveStackSlug()).toBe('jobbingtrack');
    const map = buildKnownServicesMap();
    expect(map['jobbingtrack-api-gateway']).toMatchObject({
      port: 3000,
      composeService: 'api-gateway',
    });
    expect(resolveProbeHost('jobbingtrack-api-gateway', map)).toBe('api-gateway');
  });

  it('préfixe jobbingtrack-preprod pour la stack Portainer préprod', () => {
    process.env.STACK_SLUG = 'jobbingtrack-preprod';
    const map = buildKnownServicesMap();
    expect(map['jobbingtrack-preprod-api-gateway'].composeService).toBe('api-gateway');
    expect(map['jobbingtrack-api-gateway']).toBeUndefined();
    expect(resolveProbeHost('jobbingtrack-preprod-frontend', map)).toBe('frontend');
  });

  it('préfixe jobbingtrack-prod pour la stack prod', () => {
    process.env.STACK_SLUG = 'jobbingtrack-prod';
    const map = buildKnownServicesMap();
    expect(Object.keys(map).every((k) => k.startsWith('jobbingtrack-prod-'))).toBe(true);
    expect(resolveProbeHost('jobbingtrack-prod-auth-service', map)).toBe('auth-service');
  });
});
