/**
 * Module : Candidature Rejetée après Entretien
 * Description : Teste le scénario où l'entreprise ne nous a pas pris après entretien
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepApplicationRejected(options = {}) {
  const {
    token,
    applicationId,
    rejectionReason = 'Candidat ne correspond pas au profil recherché',
    rejectionData = {
      status: 'REJECTED',
      comment: rejectionReason,
      rejectionDate: new Date().toISOString()
    },
    expectedStatus = 200
  } = options;

  const startTime = Date.now();
  let result = {
    step: 'application_rejected',
    name: 'Candidature Rejetée après Entretien',
    status: 'pending',
    duration: 0,
    data: null,
    error: null,
    verifications: []
  };

  if (!token) {
    result.status = 'skipped';
    result.message = '⏭️ Token non fourni, étape ignorée';
    return result;
  }

  if (!applicationId) {
    result.status = 'skipped';
    result.message = '⏭️ ApplicationId non fourni, étape ignorée';
    return result;
  }

  try {
    // Vérifier que la candidature a bien un entretien
    const appResponse = await axios.get(
      `${API_URL}/api/v1/applications/${applicationId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      }
    );

    if (appResponse.status !== 200) {
      result.status = 'error';
      result.error = `Impossible de récupérer la candidature: ${appResponse.statusText}`;
      result.message = `❌ ${result.error}`;
      result.duration = Date.now() - startTime;
      return result;
    }

    const application = appResponse.data;
    const verifications = [];

    // Vérifier s'il y a des entretiens
    try {
      const interviewsResponse = await axios.get(
        `${API_URL}/api/v1/interviews?applicationId=${applicationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true
        }
      );

      if (interviewsResponse.status === 200 && interviewsResponse.data?.length > 0) {
        verifications.push({
          check: 'Entretien existant',
          status: 'success',
          message: `✅ ${interviewsResponse.data.length} entretien(s) trouvé(s)`
        });
      } else {
        verifications.push({
          check: 'Entretien existant',
          status: 'warning',
          message: '⚠️ Aucun entretien trouvé pour cette candidature'
        });
      }
    } catch (error) {
      verifications.push({
        check: 'Entretien existant',
        status: 'warning',
        message: `⚠️ Impossible de vérifier les entretiens: ${error.message}`
      });
    }

    // Mettre à jour le statut à REJECTED
    const updateResponse = await axios.put(
      `${API_URL}/api/v1/applications/${applicationId}/status`,
      rejectionData,
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      }
    );

    result.duration = Date.now() - startTime;

    if (updateResponse.status === expectedStatus) {
      verifications.push({
        check: 'Mise à jour statut REJECTED',
        status: 'success',
        message: `✅ Statut mis à jour à REJECTED: ${rejectionReason}`
      });

      // Vérifier que le statut est bien REJECTED
      const verifyResponse = await axios.get(
        `${API_URL}/api/v1/applications/${applicationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true
        }
      );

      if (verifyResponse.status === 200 && verifyResponse.data?.status === 'REJECTED') {
        verifications.push({
          check: 'Vérification statut REJECTED',
          status: 'success',
          message: '✅ Statut confirmé: REJECTED'
        });
      } else {
        verifications.push({
          check: 'Vérification statut REJECTED',
          status: 'error',
          message: `❌ Statut non confirmé: ${verifyResponse.data?.status || 'inconnu'}`
        });
      }

      // Vérifier l'historique
      try {
        const historyResponse = await axios.get(
          `${API_URL}/api/v1/applications/${applicationId}/status-history`,
          {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: () => true
          }
        );

        if (historyResponse.status === 200 && historyResponse.data?.length > 0) {
          const lastEntry = historyResponse.data[historyResponse.data.length - 1];
          if (lastEntry.newStatus === 'REJECTED') {
            verifications.push({
              check: 'Historique rejet',
              status: 'success',
              message: '✅ Rejet enregistré dans l\'historique'
            });
          }
        }
      } catch (error) {
        verifications.push({
          check: 'Historique rejet',
          status: 'warning',
          message: `⚠️ Impossible de vérifier l'historique: ${error.message}`
        });
      }
    } else {
      verifications.push({
        check: 'Mise à jour statut REJECTED',
        status: 'error',
        message: `❌ Échec mise à jour: ${updateResponse.data?.message || updateResponse.statusText}`
      });
    }

    result.verifications = verifications;
    result.data = {
      previousStatus: application.status,
      newStatus: 'REJECTED',
      application: updateResponse.data,
      rejectionReason,
      statusCode: updateResponse.status
    };

    // Déterminer le statut global
    const hasErrors = verifications.some(v => v.status === 'error');
    const hasWarnings = verifications.some(v => v.status === 'warning');

    if (!hasErrors) {
      result.status = hasWarnings ? 'warning' : 'success';
      result.message = `✅ Candidature marquée comme rejetée: ${rejectionReason}`;
    } else {
      result.status = 'error';
      result.error = 'Erreurs lors du rejet de la candidature';
      result.message = `❌ ${result.error}`;
    }
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur lors du rejet de la candidature: ${error.message}`;
  }

  return result;
}

module.exports = { stepApplicationRejected };

