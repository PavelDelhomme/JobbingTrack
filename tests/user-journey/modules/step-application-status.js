/**
 * Module : Vérification et Mise à jour Statut Candidature
 * Description : Teste la vérification et la mise à jour du statut d'une candidature
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepApplicationStatus(options = {}) {
  const {
    token,
    applicationId,
    newStatus = null, // Si fourni, met à jour le statut
    verifyStatus = true, // Si true, vérifie le statut actuel
    expectedStatus = 200
  } = options;

  const startTime = Date.now();
  let result = {
    step: 'application_status',
    name: newStatus ? 'Mise à jour Statut Candidature' : 'Vérification Statut Candidature',
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
    // Récupérer le statut actuel
    const getResponse = await axios.get(
      `${API_URL}/api/v1/applications/${applicationId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      }
    );

    if (getResponse.status !== 200) {
      result.status = 'error';
      result.error = `Impossible de récupérer la candidature: ${getResponse.statusText}`;
      result.message = `❌ ${result.error}`;
      result.duration = Date.now() - startTime;
      return result;
    }

    const currentStatus = getResponse.data?.status;
    const verifications = [];

    if (verifyStatus) {
      verifications.push({
        check: 'Statut actuel',
        status: 'success',
        message: `✅ Statut actuel: ${currentStatus}`
      });
    }

    // Mettre à jour le statut si demandé
    if (newStatus && newStatus !== currentStatus) {
      const updateResponse = await axios.put(
        `${API_URL}/api/v1/applications/${applicationId}/status`,
        {
          status: newStatus,
          comment: `Mise à jour automatique via test - ${new Date().toISOString()}`
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true
        }
      );

      result.duration = Date.now() - startTime;

      if (updateResponse.status === expectedStatus) {
        verifications.push({
          check: 'Mise à jour statut',
          status: 'success',
          message: `✅ Statut mis à jour: ${currentStatus} → ${newStatus}`
        });

        // Vérifier l'historique des statuts
        try {
          const historyResponse = await axios.get(
            `${API_URL}/api/v1/applications/${applicationId}/status-history`,
            {
              headers: { Authorization: `Bearer ${token}` },
              validateStatus: () => true
            }
          );

          if (historyResponse.status === 200 && historyResponse.data?.length > 0) {
            verifications.push({
              check: 'Historique statuts',
              status: 'success',
              message: `✅ Historique mis à jour (${historyResponse.data.length} entrées)`
            });
          }
        } catch (error) {
          verifications.push({
            check: 'Historique statuts',
            status: 'warning',
            message: `⚠️ Impossible de vérifier l'historique: ${error.message}`
          });
        }
      } else {
        verifications.push({
          check: 'Mise à jour statut',
          status: 'error',
          message: `❌ Échec mise à jour: ${updateResponse.data?.message || updateResponse.statusText}`
        });
      }

      result.data = {
        previousStatus: currentStatus,
        newStatus,
        application: updateResponse.data,
        statusCode: updateResponse.status
      };
    } else {
      result.duration = Date.now() - startTime;
      result.data = {
        currentStatus,
        application: getResponse.data
      };

      if (newStatus === currentStatus) {
        verifications.push({
          check: 'Mise à jour statut',
          status: 'info',
          message: `ℹ️ Statut déjà à ${newStatus}, aucune mise à jour nécessaire`
        });
      }
    }

    result.verifications = verifications;

    // Déterminer le statut global
    const hasErrors = verifications.some(v => v.status === 'error');
    const hasWarnings = verifications.some(v => v.status === 'warning');

    if (!hasErrors) {
      result.status = hasWarnings ? 'warning' : 'success';
      result.message = newStatus
        ? `✅ Statut candidature ${hasErrors ? 'partiellement' : ''} mis à jour`
        : `✅ Statut candidature vérifié: ${currentStatus}`;
    } else {
      result.status = 'error';
      result.error = 'Erreurs lors de la vérification/mise à jour du statut';
      result.message = `❌ ${result.error}`;
    }
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur lors de la vérification du statut: ${error.message}`;
  }

  return result;
}

module.exports = { stepApplicationStatus };

