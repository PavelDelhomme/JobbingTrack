const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport(
      this.buildTransportConfig({
        host: process.env.SMTP_HOST || 'mailhog',
        port: process.env.SMTP_PORT || 1025,
        secure: process.env.SMTP_SECURE,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }, 'SMTP')
    );

    this.securityAlertMirrorTransporter = this.buildSecurityAlertMirrorTransporter();
  }

  buildTransportConfig(config, label) {
    const transportConfig = {
      host: config.host,
      port: Number(config.port),
      secure: config.secure === 'true',
      connectionTimeout: Number(config.timeoutMs || 8000),
      greetingTimeout: Number(config.timeoutMs || 8000),
      socketTimeout: Number(config.timeoutMs || 8000),
      tls: {
        rejectUnauthorized: false
      }
    };

    if (config.user && config.pass) {
      transportConfig.auth = {
        user: config.user,
        pass: config.pass
      };
    } else if (config.user || config.pass) {
      logger.warn(`Configuration ${label} incomplète: auth désactivée car USER ou PASS manque`);
    }

    return transportConfig;
  }

  buildSecurityAlertMirrorTransporter() {
    if (process.env.SECURITY_ALERT_SMTP_MIRROR_ENABLED !== 'true') {
      return null;
    }

    const host = this.pickUsableEnvValue(
      process.env.SECURITY_ALERT_MIRROR_SMTP_HOST,
      process.env.SMTP_REAL_HOST
    );
    const port = this.pickUsableEnvValue(
      process.env.SECURITY_ALERT_MIRROR_SMTP_PORT,
      process.env.SMTP_REAL_PORT,
      '587'
    );
    const useSsl = this.pickUsableEnvValue(
      process.env.SECURITY_ALERT_MIRROR_SMTP_USE_SSL,
      process.env.SMTP_REAL_USE_SSL
    );
    const secure =
      process.env.SECURITY_ALERT_MIRROR_SMTP_FORCE_SSL === 'true'
        ? 'true'
        : String(port) === '587'
          ? 'false'
          : useSsl === 'true'
            ? 'true'
            : String(port) === '465'
              ? 'true'
              : 'false';

    if (!host || !port) {
      logger.warn('Miroir SMTP alertes sécurité activé mais host/port manquant');
      return null;
    }

    return nodemailer.createTransport(
      this.buildTransportConfig({
        host,
        port,
        secure,
        user: this.pickUsableEnvValue(
          process.env.SECURITY_ALERT_MIRROR_SMTP_USER,
          process.env.SMTP_REAL_USER
        ),
        pass: this.pickUsableEnvValue(
          process.env.SECURITY_ALERT_MIRROR_SMTP_PASS,
          process.env.SMTP_REAL_PASS
        ),
        timeoutMs: process.env.SECURITY_ALERT_MIRROR_SMTP_TIMEOUT_MS
      }, 'SECURITY_ALERT_MIRROR_SMTP')
    );
  }

  isPlaceholderValue(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return (
      !normalized ||
      normalized.includes('example.invalid') ||
      normalized.includes('xxx') ||
      normalized === 'changeme' ||
      normalized === 'change-me'
    );
  }

  pickUsableEnvValue(...values) {
    for (const value of values) {
      if (!this.isPlaceholderValue(value)) {
        return String(value).trim();
      }
    }
    return '';
  }

  formatSenderWithAddress(sender, fallbackAddress) {
    const address = this.pickUsableEnvValue(fallbackAddress);
    if (!address) {
      return sender;
    }

    const match = String(sender || '').match(/^\s*(.*?)\s*<[^>]+>\s*$/);
    const displayName = match && match[1] ? match[1].trim() : '';
    return displayName ? `${displayName} <${address}>` : address;
  }

  resolveSecurityAlertMirrorFrom(options = {}) {
    if (options.mirrorFrom) {
      return options.mirrorFrom;
    }

    const configuredFrom = process.env.SECURITY_ALERT_MIRROR_SMTP_FROM;
    const smtpUser = this.pickUsableEnvValue(
      process.env.SECURITY_ALERT_MIRROR_SMTP_USER,
      process.env.SMTP_REAL_USER
    );

    if (process.env.SECURITY_ALERT_MIRROR_SMTP_FORCE_FROM_ALIAS === 'true') {
      return configuredFrom || smtpUser;
    }

    return this.formatSenderWithAddress(configuredFrom, smtpUser) || smtpUser;
  }

  resolvePublicSenderIdentity({
    configuredFrom,
    configuredReplyTo,
    smtpUser,
    forceAlias = false
  } = {}) {
    const authUser = this.pickUsableEnvValue(smtpUser);
    const from = forceAlias
      ? (configuredFrom || authUser)
      : (this.formatSenderWithAddress(configuredFrom, authUser) || configuredFrom || authUser);
    const replyTo = this.pickUsableEnvValue(configuredReplyTo) || undefined;

    return { from, replyTo };
  }

  getCrashReportIdentity() {
    return this.resolvePublicSenderIdentity({
      configuredFrom:
        process.env.CRASH_REPORT_FROM ||
        process.env.SMTP_FROM ||
        'JobbingTrack Crash Reports <redacted@example.invalid>',
      configuredReplyTo:
        process.env.CRASH_REPORT_REPLY_TO ||
        process.env.SMTP_REPLY_TO,
      smtpUser: process.env.SMTP_USER,
      forceAlias: process.env.CRASH_REPORT_FORCE_FROM_ALIAS === 'true'
    });
  }

  async sendEmail(to, subject, html, options = {}) {
    try {
      const mailOptions = {
        from: options.from || process.env.SMTP_FROM || 'JobbingTrack <redacted@example.invalid>',
        to,
        subject,
        html,
        replyTo: options.replyTo || process.env.SMTP_REPLY_TO || undefined
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email envoyé à ${to}: ${info.messageId}`);

      if (options.securityAlertMirror === true && this.securityAlertMirrorTransporter) {
        logger.info(`Email alerte sécurité miroir SMTP planifié pour ${to}`);
        this.sendSecurityAlertMirror(to, mailOptions, options).catch((mirrorError) => {
          logger.warn('Envoi miroir SMTP alerte sécurité échoué', {
            to,
            error: mirrorError.message
          });
        });
        info.securityAlertMirror = { queued: true };
      }

      return info;
    } catch (error) {
      logger.error('Erreur envoi email:', error);
      throw error;
    }
  }

  async sendSecurityAlertMirror(to, mailOptions, options = {}) {
    const mirrorMailOptions = {
      ...mailOptions,
      from: this.resolveSecurityAlertMirrorFrom(options) || mailOptions.from,
      replyTo:
        options.mirrorReplyTo ||
        process.env.SECURITY_ALERT_MIRROR_SMTP_REPLY_TO ||
        mailOptions.replyTo
    };
    const mirrorInfo = await this.securityAlertMirrorTransporter.sendMail(mirrorMailOptions);
    logger.info(`Email alerte sécurité miroir SMTP envoyé à ${to}: ${mirrorInfo.messageId}`, {
      from: mirrorMailOptions.from,
      replyTo: mirrorMailOptions.replyTo || null
    });
    return mirrorInfo;
  }

  async sendNotificationEmail(user, notification) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; margin: 0;">JobbingTrack</h1>
        </div>

        <h2 style="color: #1f2937;">${notification.title}</h2>
        <p>${notification.message}</p>

        ${notification.link ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${notification.link}"
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Voir les détails
            </a>
          </div>
        ` : ''}

        <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
          Cordialement,<br>L'équipe JobbingTrack
        </p>
      </div>
    `;

    return this.sendEmail(user.email, notification.title, html);
  }

  async sendReminderEmail(user, reminder) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; margin: 0;">🔔 JobbingTrack</h1>
        </div>

        <h2 style="color: #1f2937;">Rappel : ${reminder.title}</h2>
        ${reminder.description ? `<p>${reminder.description}</p>` : ''}

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #374151; margin: 0;">
            N'oubliez pas de prendre les actions nécessaires concernant cette tâche.
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
          Cordialement,<br>L'équipe JobbingTrack
        </p>
      </div>
    `;

    return this.sendEmail(user.email, `Rappel : ${reminder.title}`, html);
  }
}

module.exports = new EmailService();

