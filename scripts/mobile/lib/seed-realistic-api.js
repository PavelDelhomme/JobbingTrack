/**
 * Seed API du jeu réaliste (interleaved-scenarios) pour un compte connecté.
 * @used-by scripts/mobile/setup/seed-realistic-user-data-api.js, reset-porteur-validation-data.js
 */

const { createApiThrottle } = require('../../../tools/api/throttle');
const { INTERLEAVED_SCENARIOS, seedScenario } = require('./interleaved-scenarios');

function createRealisticSeedClient({ gatewayUrl, token, delayMs = 350 }) {
  const throttle = createApiThrottle(delayMs);

  async function api(method, path, body) {
    await throttle.waitTurn();
    const res = await fetch(`${gatewayUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });
    let data = {};
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    return { status: res.status, data };
  }

  async function createApplication(payload) {
    const res = await api('POST', '/api/v1/applications', {
      contractType: 'CDI',
      applicationType: 'OFFRE',
      applicationDate: new Date().toISOString(),
      location: 'France',
      notes: '',
      ...payload,
    });
    if (res.status !== 201 && res.status !== 200) {
      throw new Error(
        `Créer candidature ${payload.position} @ ${payload.companyName} : ${res.status} ${JSON.stringify(res.data).slice(0, 120)}`,
      );
    }
    const app = res.data.application || res.data;
    return { id: app.id, companyId: app.companyId || app.company?.id, raw: app };
  }

  async function createContact(payload) {
    const res = await api('POST', '/api/v1/contacts', payload);
    if (res.status !== 201) {
      throw new Error(`Créer contact ${payload.firstName} ${payload.lastName} : ${res.status}`);
    }
    return res.data.contact;
  }

  async function linkContact(contactId, applicationId) {
    const res = await api('POST', `/api/v1/contacts/${contactId}/link-application`, { applicationId });
    if (res.status !== 200) throw new Error(`Lier contact ${contactId} : ${res.status}`);
  }

  async function createFollowUp(applicationId, followUpDate, notes) {
    const res = await api('POST', '/api/v1/followups', { applicationId, followUpDate, notes });
    if (res.status !== 201) throw new Error(`Créer relance : ${res.status}`);
    return res.data.followUp || res.data.followup;
  }

  async function createInterview(applicationId, interviewDate, notes, location) {
    const res = await api('POST', '/api/v1/interviews', {
      applicationId,
      interviewDate,
      notes,
      location,
    });
    if (res.status !== 201) throw new Error(`Créer entretien : ${res.status}`);
    return res.data.interview;
  }

  async function createCall(payload) {
    const res = await api('POST', '/api/v1/calls', payload);
    if (res.status !== 201) {
      throw new Error(`Créer appel : ${res.status} ${JSON.stringify(res.data).slice(0, 80)}`);
    }
    return res.data.call;
  }

  async function linkCallToFollowUp(callId, followUpId) {
    const res = await api('PUT', `/api/v1/calls/${callId}`, { followUpId });
    if (res.status !== 200) throw new Error(`Lier appel→relance : ${res.status}`);
  }

  async function seedInterleavedScenarios({ log = console.log } = {}) {
    const ctx = {
      api,
      createApplication,
      createContact,
      linkContact,
      createFollowUp,
      createInterview,
      createCall: ({ applicationId, callDate, subject, notes, contactId, companyId }) =>
        createCall({
          callDate,
          subject,
          notes,
          ...(applicationId ? { applicationId } : {}),
          ...(contactId ? { contactId } : {}),
          ...(companyId ? { companyId } : {}),
        }),
      linkCallToFollowUp,
      seeded: {},
    };

    for (const scenario of INTERLEAVED_SCENARIOS) {
      const result = await seedScenario(scenario, ctx);
      if (scenario.kind === 'application') ctx.seeded[scenario.id] = result;
      log(`✅ ${scenario.label} — ${scenario.seedSummary || scenario.kind}`);
    }

    const summary = await api('GET', '/api/v1/applications?limit=200');
    const count = (summary.data.applications || []).length;
    return { applicationCount: count, scenarioCount: INTERLEAVED_SCENARIOS.length };
  }

  return {
    api,
    seedInterleavedScenarios,
  };
}

module.exports = {
  INTERLEAVED_SCENARIOS,
  createRealisticSeedClient,
};
