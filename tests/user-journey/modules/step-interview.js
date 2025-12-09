/**
 * Module : Ajout Entretien à Candidature
 * Description : Teste l'ajout d'un entretien à une candidature et vérifie la création d'événement
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepInterview(options = {}) {
  const {
    token,
    applicationId,
    interviewData = {
      type: 'PHONE',
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Demain
      location: 'En ligne',
      notes: 'Entretien technique',
      interviewerName: 'Jean Dupont',
      interviewerEmail: 'redacted@example.invalid'
    },
    expectedStatus = 201,
    verifyEventCreation = true
  } = options;

  const startTime = Date.now();
  let result = {
    step: 'interview',
    name: 'Ajout Entretien à Candidature',
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
    // Récupérer le statut actuel de la candidature
    const appBeforeResponse = await axios.get(
      `${API_URL}/api/v1/applications/${applicationId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      }
    );

    const previousStatus = appBeforeResponse.data?.status;

    // Créer l'entretien
    const interviewResponse = await axios.post(
      `${API_URL}/api/v1/interviews`,
      {
        ...interviewData,
        applicationId
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      }
    );

    result.duration = Date.now() - startTime;
    const interviewId = interviewResponse.data?.id;

    // Vérifications
    const verifications = [];

    // 1. Vérifier que l'entretien a été créé
    if (interviewResponse.status === expectedStatus && interviewId) {
      verifications.push({
        check: 'Création entretien',
        status: 'success',
        message: '✅ Entretien créé avec succès'
      });
    } else {
      verifications.push({
        check: 'Création entretien',
        status: 'error',
        message: `❌ Échec création entretien: ${interviewResponse.data?.message || interviewResponse.statusText}`
      });
    }

    // 2. Vérifier la création d'événement si demandé
    if (verifyEventCreation && interviewId) {
      try {
        const eventsResponse = await axios.get(
          `${API_URL}/api/v1/events?interviewId=${interviewId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: () => true
          }
        );

        if (eventsResponse.status === 200 && eventsResponse.data?.length > 0) {
          verifications.push({
            check: 'Création événement',
            status: 'success',
            message: '✅ Événement créé automatiquement pour l\'entretien'
          });
        } else {
          verifications.push({
            check: 'Création événement',
            status: 'warning',
            message: '⚠️ Aucun événement trouvé pour l\'entretien (peut être normal selon la configuration)'
          });
        }
      } catch (error) {
        verifications.push({
          check: 'Création événement',
          status: 'warning',
          message: `⚠️ Impossible de vérifier la création d'événement: ${error.message}`
        });
      }
    }

    // 3. Vérifier la mise à jour du statut de la candidature
    try {
      const appAfterResponse = await axios.get(
        `${API_URL}/api/v1/applications/${applicationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true
        }
      );

      const newStatus = appAfterResponse.data?.status;
      if (newStatus !== previousStatus) {
        verifications.push({
          check: 'Mise à jour statut',
          status: 'success',
          message: `✅ Statut candidature mis à jour: ${previousStatus} → ${newStatus}`
        });
      } else {
        verifications.push({
          check: 'Mise à jour statut',
          status: 'info',
          message: `ℹ️ Statut candidature inchangé: ${previousStatus}`
        });
      }
    } catch (error) {
      verifications.push({
        check: 'Mise à jour statut',
        status: 'warning',
        message: `⚠️ Impossible de vérifier le statut: ${error.message}`
      });
    }

    result.verifications = verifications;
    result.data = {
      interview: interviewResponse.data,
      interviewId,
      previousStatus,
      statusCode: interviewResponse.status
    };

    // Déterminer le statut global
    const hasErrors = verifications.some(v => v.status === 'error');
    const hasWarnings = verifications.some(v => v.status === 'warning');

    if (interviewResponse.status === expectedStatus && !hasErrors) {
      result.status = hasWarnings ? 'warning' : 'success';
      result.message = `✅ Entretien ajouté à la candidature (${interviewData.type})`;
    } else {
      result.status = 'error';
      result.error = `Création entretien échouée: ${interviewResponse.data?.message || interviewResponse.statusText}`;
      result.message = `❌ ${result.error}`;
    }
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur lors de l'ajout de l'entretien: ${error.message}`;
  }

  return result;
}

module.exports = { stepInterview };

