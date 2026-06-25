/**
 * Parcours BlueMail documenté (UI AVD API 34).
 * @used-by scripts/mobile/setup/setup-emulator-bluemail.js
 */

const { ImapSession } = require('../email/fetch-imap-verification');

async function verifyOvhImap(cfg) {
  const mailbox = cfg.ovhImap;
  if (!mailbox?.email || !mailbox.password) {
    return { ok: false, error: 'config_incomplete', message: 'EMAIL_TRIAGE_READ_ACCOUNT/PASSWORD manquants' };
  }
  const session = new ImapSession(mailbox);
  try {
    await session.connect();
    await session.login();
    await session.selectInbox();
    session.close();
    return { ok: true, host: mailbox.host };
  } catch (err) {
    session.close();
    return {
      ok: false,
      error: 'authentication_failed',
      message: err.message || 'AUTHENTICATIONFAILED',
      host: mailbox.host,
    };
  }
}

async function tapReliableLabel(phone, label) {
  if (await phone.uiContains(label)) {
    await phone.tapReliable(label);
    await phone.wait(900);
    return true;
  }
  const nodes = await phone.uiNodes();
  const node = nodes.find(
    (n) =>
      n.clickable &&
      ((n.contentDesc && n.contentDesc.toLowerCase() === label.toLowerCase()) ||
        (n.text && n.text.toLowerCase() === label.toLowerCase())),
  );
  if (!node?.bounds) return false;
  const m = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!m) return false;
  await phone.tapXY(
    Math.round((Number(m[1]) + Number(m[3])) / 2),
    Math.round((Number(m[2]) + Number(m[4])) / 2),
  );
  await phone.wait(900);
  return true;
}

async function fillImapSettings(phone, { email, password, host }) {
  await phone.typeInLabeledField('Email Address', email, { clearFirst: true });
  await phone.wait(300);
  await phone.typeInLabeledField('Username', email, { clearFirst: true });
  await phone.wait(300);
  await phone.typeInLabeledField('Password', password, {
    clearFirst: true,
    secret: true,
    isPassword: true,
  });
  await phone.wait(300);
  await phone.typeInLabeledField('IMAP server', host, { clearFirst: true });
  await phone.wait(300);
  await phone.closeKeyboard();
  await phone.wait(400);
}

async function fillSmtpSettingsIfVisible(phone, { email, password }) {
  if (!(await phone.uiContains('SMTP'))) return false;
  const smtpHost = 'ssl0.ovh.net';
  if (await phone.uiContains('SMTP server')) {
    await phone.typeInLabeledField('SMTP server', smtpHost, { clearFirst: true });
  }
  if (await phone.uiContains('Email Address')) {
    await phone.typeInLabeledField('Email Address', email, { clearFirst: true });
  }
  if (await phone.uiContains('Password')) {
    await phone.typeInLabeledField('Password', password, {
      clearFirst: true,
      secret: true,
      isPassword: true,
    });
  }
  await phone.closeKeyboard();
  await phone.wait(400);
  return true;
}

async function blueMailShowsAccount(phone, email) {
  const needle = email.split('@')[0].toLowerCase();
  if (await phone.uiContains(email)) return true;
  if (await phone.uiContains('Inbox')) return true;
  if (await phone.uiContains('Boîte de réception')) return true;
  if (needle.length > 4 && (await phone.uiContains(needle))) return true;
  return false;
}

async function blueMailAuthFailed(phone) {
  return (
    (await phone.uiContains('Authentication failed')) ||
    (await phone.uiContains('Setup could not finish')) ||
    (await phone.uiContains('Échec'))
  );
}

async function configureBlueMailOvh(phone, pkg, cfg) {
  const email = cfg.readAccount;
  const password = cfg.ovhImap.password;
  const host = cfg.ovhImap.host || 'imap.mail.ovh.net';

  await phone.shellCommand(`am force-stop ${pkg}`);
  await phone.wait(600);
  await phone.shellCommand(`am start -n ${pkg}/com.trtf.blue.MainActivity`);
  await phone.wait(2500);

  await tapReliableLabel(phone, 'Continue');
  await phone.wait(1200);

  await phone.typeInLabeledField('Enter your email address', email, { clearFirst: true });
  await phone.wait(400);
  await tapReliableLabel(phone, 'Manual Setup');
  await phone.wait(1200);
  await tapReliableLabel(phone, 'Manual Setup');
  await phone.wait(1200);
  await tapReliableLabel(phone, 'IMAP');
  await phone.wait(2000);

  await fillImapSettings(phone, { email, password, host });
  await tapReliableLabel(phone, 'Next');
  await phone.wait(3500);

  if (await blueMailAuthFailed(phone)) {
    return { ok: false, step: 'imap_login', error: 'authentication_failed' };
  }

  await fillSmtpSettingsIfVisible(phone, { email, password });
  for (const label of ['Next', 'Done', 'Finish', 'Terminé', 'Save', 'Enregistrer', 'Sign In']) {
    if (await tapReliableLabel(phone, label)) await phone.wait(2000);
  }

  for (let i = 0; i < 5; i += 1) {
    if (await blueMailShowsAccount(phone, email)) {
      return { ok: true, step: 'inbox' };
    }
    if (await blueMailAuthFailed(phone)) {
      return { ok: false, step: 'post_smtp', error: 'authentication_failed' };
    }
    await tapReliableLabel(phone, 'Allow');
    await tapReliableLabel(phone, 'Skip');
    await tapReliableLabel(phone, 'Not now');
    await phone.wait(1500);
  }

  if (await blueMailShowsAccount(phone, email)) {
    return { ok: true, step: 'inbox' };
  }
  return { ok: false, step: 'unknown', error: 'ui_not_confirmed' };
}

module.exports = {
  verifyOvhImap,
  configureBlueMailOvh,
  blueMailShowsAccount,
  blueMailAuthFailed,
};
