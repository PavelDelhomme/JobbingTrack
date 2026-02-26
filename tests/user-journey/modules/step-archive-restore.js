/**
 * Étape : Archiver puis restaurer une candidature
 * Correspond à la section 9.5 de FONCTIONNALITES.md — swipe archive/corbeille
 * Vérifie : archivage, absence dans liste, désarchivage, suppression soft, restauration
 */

const axios = require('axios');
const API_URL = process.env.API_GATEWAY_URL || process.env.API_URL || 'http://localhost:5002';

async function stepArchiveRestore(options = {}) {
  const { token, applicationId } = options;
  const startTime = Date.now();
  const verifications = [];

  if (!token || !applicationId) {
    return { step: 'archive_restore', name: 'Archivage & Restauration', status: 'skipped', message: '⏭️ Token ou applicationId manquant', verifications: [] };
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    const archiveRes = await axios.post(`${API_URL}/api/v1/applications/${applicationId}/archive`, {}, { headers, validateStatus: () => true, timeout: 8000 });
    verifications.push({
      check: 'archive',
      passed: archiveRes.status === 200,
      message: archiveRes.status === 200 ? '✅ Candidature archivée' : `⚠️ Archivage : ${archiveRes.status}`
    });

    if (archiveRes.status === 200) {
      const listRes = await axios.get(`${API_URL}/api/v1/applications`, { headers, validateStatus: () => true, timeout: 8000 });
      const apps = listRes.data?.applications || listRes.data?.data || [];
      const found = apps.find(a => a.id === applicationId);
      verifications.push({
        check: 'hidden_from_list',
        passed: !found,
        message: found ? '⚠️ Candidature encore visible après archivage' : '✅ Candidature masquée dans la liste'
      });

      const unarchiveRes = await axios.post(`${API_URL}/api/v1/applications/${applicationId}/unarchive`, {}, { headers, validateStatus: () => true, timeout: 8000 });
      verifications.push({
        check: 'unarchive',
        passed: unarchiveRes.status === 200,
        message: unarchiveRes.status === 200 ? '✅ Candidature désarchivée' : `⚠️ Désarchivage : ${unarchiveRes.status}`
      });
    }

    const deleteRes = await axios.delete(`${API_URL}/api/v1/applications/${applicationId}`, { headers, validateStatus: () => true, timeout: 8000 });
    verifications.push({
      check: 'soft_delete',
      passed: deleteRes.status === 200,
      message: deleteRes.status === 200 ? '✅ Suppression soft (corbeille)' : `⚠️ Suppression : ${deleteRes.status}`
    });

    if (deleteRes.status === 200) {
      const restoreRes = await axios.post(`${API_URL}/api/v1/applications/${applicationId}/restore`, {}, { headers, validateStatus: () => true, timeout: 8000 });
      verifications.push({
        check: 'restore',
        passed: restoreRes.status === 200,
        message: restoreRes.status === 200 ? '✅ Restauration depuis corbeille' : `⚠️ Restauration : ${restoreRes.status}`
      });
    }

    const allPassed = verifications.every(v => v.passed);
    return {
      step: 'archive_restore',
      name: 'Archivage & Restauration',
      status: allPassed ? 'success' : 'warning',
      duration: Date.now() - startTime,
      message: allPassed ? '✅ Archivage/corbeille/restauration OK' : '⚠️ Archivage partiel',
      data: { applicationId },
      verifications
    };
  } catch (error) {
    return {
      step: 'archive_restore',
      name: 'Archivage & Restauration',
      status: 'error',
      duration: Date.now() - startTime,
      error: error.message,
      message: `❌ Erreur archivage : ${error.message}`,
      verifications
    };
  }
}

module.exports = { stepArchiveRestore };
