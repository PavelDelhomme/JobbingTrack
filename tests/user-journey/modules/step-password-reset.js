/**
 * Étape : Parcours complet de réinitialisation mot de passe
 * Correspond à la section 9.3 de FONCTIONNALITES.md — oubli mot de passe
 * Vérifie : demande reset, email MailHog, extraction lien, validation token
 */

const axios = require('axios');
const API_URL = process.env.API_GATEWAY_URL || process.env.API_URL || 'http://localhost:5002';
const MAILHOG_URL = process.env.MAILHOG_URL || 'http://localhost:8025';

async function stepPasswordReset(options = {}) {
  const { email, password } = options;
  const startTime = Date.now();
  const verifications = [];

  if (!email) {
    return { step: 'password_reset', name: 'Réinitialisation Mot de Passe', status: 'skipped', message: '⏭️ Pas d\'email', verifications: [] };
  }

  try {
    const reqRes = await axios.post(`${API_URL}/api/v1/auth/forgot-password`, { email }, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
      timeout: 10000
    });
    verifications.push({
      check: 'request_reset',
      passed: [200, 201].includes(reqRes.status),
      message: [200, 201].includes(reqRes.status) ? '✅ Demande de reset envoyée' : `⚠️ Demande reset : ${reqRes.status}`
    });

    await new Promise(r => setTimeout(r, 2000));

    let resetToken = null;
    try {
      const mailRes = await axios.get(`${MAILHOG_URL}/api/v2/search?kind=to&query=${encodeURIComponent(email)}`, { timeout: 5000 });
      const items = mailRes.data?.items || [];
      verifications.push({
        check: 'mailhog_email',
        passed: items.length > 0,
        message: items.length > 0 ? `✅ Email trouvé dans MailHog (${items.length} mails)` : '⚠️ Aucun email trouvé dans MailHog'
      });

      if (items.length > 0) {
        const lastMail = items[0];
        const body = lastMail.Content?.Body || '';
        const decoded = Buffer.from(body, 'base64').toString('utf-8').replace(/=\r?\n/g, '');
        const tokenMatch = decoded.match(/token=([a-zA-Z0-9._-]+)/) || body.match(/token=([a-zA-Z0-9._-]+)/);
        if (tokenMatch) {
          resetToken = tokenMatch[1];
          verifications.push({ check: 'token_extracted', passed: true, message: `✅ Token de reset extrait` });
        } else {
          verifications.push({ check: 'token_extracted', passed: false, message: '⚠️ Token non trouvé dans le corps du mail' });
        }
      }
    } catch {
      verifications.push({ check: 'mailhog_email', passed: false, message: '⚠️ MailHog inaccessible' });
    }

    if (resetToken && password) {
      const newPass = password + '_reset';
      const resetRes = await axios.post(`${API_URL}/api/v1/auth/reset-password`, {
        token: resetToken,
        newPassword: newPass
      }, {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true,
        timeout: 8000
      });
      verifications.push({
        check: 'reset_password',
        passed: [200, 201].includes(resetRes.status),
        message: [200, 201].includes(resetRes.status) ? '✅ Mot de passe réinitialisé' : `⚠️ Reset : ${resetRes.status}`
      });

      if ([200, 201].includes(resetRes.status)) {
        const loginRes = await axios.post(`${API_URL}/api/v1/auth/login`, {
          email, password: newPass
        }, {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true,
          timeout: 8000
        });
        verifications.push({
          check: 'login_new_password',
          passed: loginRes.status === 200,
          message: loginRes.status === 200 ? '✅ Connexion avec nouveau mot de passe OK' : `⚠️ Connexion nouveau mdp : ${loginRes.status}`
        });

        const revertRes = await axios.post(`${API_URL}/api/v1/auth/reset-password`, {
          token: resetToken,
          newPassword: password
        }, {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true,
          timeout: 8000
        }).catch(() => null);

        if (!revertRes || ![200, 201].includes(revertRes?.status)) {
          const loginToken = loginRes.data?.token || loginRes.data?.accessToken;
          if (loginToken) {
            await axios.put(`${API_URL}/api/v1/auth/change-password`, {
              currentPassword: newPass,
              newPassword: password
            }, {
              headers: { Authorization: `Bearer ${loginToken}`, 'Content-Type': 'application/json' },
              validateStatus: () => true,
              timeout: 8000
            }).catch(() => null);
          }
        }
      }
    }

    const allPassed = verifications.every(v => v.passed);
    return {
      step: 'password_reset',
      name: 'Réinitialisation Mot de Passe',
      status: allPassed ? 'success' : 'warning',
      duration: Date.now() - startTime,
      message: allPassed ? '✅ Parcours complet reset password' : '⚠️ Reset password partiel',
      data: { resetTokenFound: !!resetToken },
      verifications
    };
  } catch (error) {
    return {
      step: 'password_reset',
      name: 'Réinitialisation Mot de Passe',
      status: 'error',
      duration: Date.now() - startTime,
      error: error.message,
      message: `❌ Erreur reset password : ${error.message}`,
      verifications
    };
  }
}

module.exports = { stepPasswordReset };
