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
});

