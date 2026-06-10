describe('Notification Service - configuration SMTP', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  test('n’envoie pas AUTH PLAIN vide quand SMTP_USER/PASS sont absents', () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const createTransport = jest.fn(() => ({ sendMail: jest.fn() }));
    jest.doMock('nodemailer', () => ({ createTransport }));
    jest.doMock('../src/utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }));

    require('../src/services/emailService');

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'mailhog',
        port: 1025
      })
    );
    expect(createTransport.mock.calls[0][0]).not.toHaveProperty('auth');
  });

  test('configure AUTH uniquement quand SMTP_USER et SMTP_PASS sont présents', () => {
    process.env.SMTP_HOST = 'smtp.example.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'noreply@example.test';
    process.env.SMTP_PASS = 'secret';

    const createTransport = jest.fn(() => ({ sendMail: jest.fn() }));
    jest.doMock('nodemailer', () => ({ createTransport }));
    jest.doMock('../src/utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }));

    require('../src/services/emailService');

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.test',
        port: 587,
        auth: {
          user: 'noreply@example.test',
          pass: 'secret'
        }
      })
    );
  });

  test('configure un miroir SMTP réel optionnel pour les alertes sécurité', async () => {
    process.env.SMTP_HOST = 'mailhog';
    process.env.SMTP_PORT = '1025';
    process.env.SECURITY_ALERT_SMTP_MIRROR_ENABLED = 'true';
    process.env.SECURITY_ALERT_MIRROR_SMTP_HOST = 'smtp.example.test';
    process.env.SECURITY_ALERT_MIRROR_SMTP_PORT = '587';
    process.env.SECURITY_ALERT_MIRROR_SMTP_SECURE = 'true';
    process.env.SECURITY_ALERT_MIRROR_SMTP_USER = 'noreply@example.test';
    process.env.SECURITY_ALERT_MIRROR_SMTP_PASS = 'secret';
    process.env.SECURITY_ALERT_MIRROR_SMTP_FROM = 'JobbingTrack Security <security@example.test>';
    process.env.SECURITY_ALERT_MIRROR_SMTP_REPLY_TO = 'security@example.test';

    const primarySendMail = jest.fn().mockResolvedValue({ messageId: 'mailhog-id' });
    const mirrorSendMail = jest.fn().mockResolvedValue({ messageId: 'mirror-id' });
    const createTransport = jest
      .fn()
      .mockReturnValueOnce({ sendMail: primarySendMail })
      .mockReturnValueOnce({ sendMail: mirrorSendMail });
    jest.doMock('nodemailer', () => ({ createTransport }));
    jest.doMock('../src/utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }));

    const emailService = require('../src/services/emailService');
    const result = await emailService.sendEmail(
      'security@example.test',
      'Test sécurité',
      '<p>ok</p>',
      { securityAlertMirror: true }
    );

    expect(createTransport).toHaveBeenCalledTimes(2);
    expect(createTransport.mock.calls[0][0]).toEqual(
      expect.objectContaining({ host: 'mailhog', port: 1025 })
    );
    expect(createTransport.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        host: 'smtp.example.test',
        port: 587,
        secure: false,
        auth: {
          user: 'noreply@example.test',
          pass: 'secret'
        }
      })
    );
    expect(primarySendMail).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mirrorSendMail).toHaveBeenCalledTimes(1);
    expect(mirrorSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'JobbingTrack Security <noreply@example.test>',
        replyTo: 'security@example.test',
        to: 'security@example.test'
      })
    );
    expect(result.securityAlertMirror).toEqual({
      queued: true
    });
  });

  test('ne fait pas échouer MailHog si le miroir SMTP réel échoue', async () => {
    process.env.SMTP_HOST = 'mailhog';
    process.env.SMTP_PORT = '1025';
    process.env.SECURITY_ALERT_SMTP_MIRROR_ENABLED = 'true';
    process.env.SECURITY_ALERT_MIRROR_SMTP_HOST = 'smtp.example.test';
    process.env.SECURITY_ALERT_MIRROR_SMTP_PORT = '587';

    const primarySendMail = jest.fn().mockResolvedValue({ messageId: 'mailhog-id' });
    const mirrorSendMail = jest.fn().mockRejectedValue(new Error('SMTP mirror down'));
    const createTransport = jest
      .fn()
      .mockReturnValueOnce({ sendMail: primarySendMail })
      .mockReturnValueOnce({ sendMail: mirrorSendMail });
    jest.doMock('nodemailer', () => ({ createTransport }));
    jest.doMock('../src/utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }));

    const emailService = require('../src/services/emailService');
    const result = await emailService.sendEmail(
      'security@example.test',
      'Test sécurité',
      '<p>ok</p>',
      { securityAlertMirror: true }
    );

    expect(primarySendMail).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mirrorSendMail).toHaveBeenCalledTimes(1);
    expect(result.messageId).toBe('mailhog-id');
    expect(result.securityAlertMirror).toEqual({
      queued: true
    });
  });
});

