/**
 * Étape : Modifier profil et vérifier les réglages utilisateur
 * Correspond à la section 9.8/9.9 de FONCTIONNALITES.md — profil/paramètres mobile
 * Vérifie : mise à jour nom, mot de passe, consultation profil
 */

const axios = require('axios');
const API_URL = process.env.API_GATEWAY_URL || process.env.API_URL || 'http://localhost:5002';

async function stepUpdateProfileSettings(options = {}) {
  const { token, password } = options;
  const startTime = Date.now();
  const verifications = [];

  if (!token) {
    return { step: 'update_profile_settings', name: 'Profil & Paramètres', status: 'skipped', message: '⏭️ Pas de token', verifications: [] };
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    const profileRes = await axios.get(`${API_URL}/api/v1/auth/profile`, { headers, validateStatus: () => true, timeout: 8000 });
    verifications.push({
      check: 'get_profile',
      passed: profileRes.status === 200,
      message: profileRes.status === 200 ? `✅ Profil récupéré : ${profileRes.data?.user?.email || profileRes.data?.email}` : `⚠️ Profil : ${profileRes.status}`
    });

    const updateRes = await axios.put(`${API_URL}/api/v1/auth/profile`, {
      firstName: 'TestMobile',
      lastName: `Journey_${Date.now()}`
    }, { headers, validateStatus: () => true, timeout: 8000 });
    verifications.push({
      check: 'update_name',
      passed: updateRes.status === 200,
      message: updateRes.status === 200 ? '✅ Nom/prénom mis à jour' : `⚠️ Mise à jour profil : ${updateRes.status}`
    });

    if (password) {
      const newPass = password + '_changed';
      const changeRes = await axios.put(`${API_URL}/api/v1/auth/change-password`, {
        currentPassword: password,
        newPassword: newPass
      }, { headers, validateStatus: () => true, timeout: 8000 });

      verifications.push({
        check: 'change_password',
        passed: [200, 201].includes(changeRes.status),
        message: [200, 201].includes(changeRes.status) ? '✅ Mot de passe changé' : `⚠️ Changement mot de passe : ${changeRes.status}`
      });

      if ([200, 201].includes(changeRes.status)) {
        const revertRes = await axios.put(`${API_URL}/api/v1/auth/change-password`, {
          currentPassword: newPass,
          newPassword: password
        }, { headers, validateStatus: () => true, timeout: 8000 });
        verifications.push({
          check: 'revert_password',
          passed: [200, 201].includes(revertRes.status),
          message: [200, 201].includes(revertRes.status) ? '✅ Mot de passe restauré' : `⚠️ Restauration mdp : ${revertRes.status}`
        });
      }
    }

    const allPassed = verifications.every(v => v.passed);
    return {
      step: 'update_profile_settings',
      name: 'Profil & Paramètres',
      status: allPassed ? 'success' : 'warning',
      duration: Date.now() - startTime,
      message: allPassed ? '✅ Profil et paramètres vérifiés' : '⚠️ Profil partiellement vérifié',
      data: {},
      verifications
    };
  } catch (error) {
    return {
      step: 'update_profile_settings',
      name: 'Profil & Paramètres',
      status: 'error',
      duration: Date.now() - startTime,
      error: error.message,
      message: `❌ Erreur profil/paramètres : ${error.message}`,
      verifications
    };
  }
}

module.exports = { stepUpdateProfileSettings };
