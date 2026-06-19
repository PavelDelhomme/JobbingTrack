const {
  IN_APP_NOTIFICATION_TYPES,
  NON_IN_APP_NOTIFICATION_TYPES,
  resolveNotificationScope,
  buildInAppTypeFilter,
} = require('../src/constants/inAppNotificationTypes');

describe('inAppNotificationTypes', () => {
  it('défaut scope in_app — filtre métier candidatures', () => {
    expect(resolveNotificationScope({})).toBe('in_app');
    expect(buildInAppTypeFilter('in_app')).toEqual({
      type: { in: IN_APP_NOTIFICATION_TYPES },
    });
  });

  it('scope all — pas de filtre type', () => {
    expect(resolveNotificationScope({ scope: 'all' })).toBe('all');
    expect(buildInAppTypeFilter('all')).toEqual({});
  });

  it('exclut crash et erreurs techniques du centre utilisateur', () => {
    expect(NON_IN_APP_NOTIFICATION_TYPES).toEqual(
      expect.arrayContaining(['CRASH_REPORT', 'ERROR_REPORT', 'SYSTEM']),
    );
    IN_APP_NOTIFICATION_TYPES.forEach((type) => {
      expect(NON_IN_APP_NOTIFICATION_TYPES).not.toContain(type);
    });
  });
});
