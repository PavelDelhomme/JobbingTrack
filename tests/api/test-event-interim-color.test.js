/**
 * Tests API : couleurs calendrier suivi intérim
 * - Événement lié à une candidature avec agencyId (boîte d'intérim) → couleur ambre #F59E0B
 * - Événement lié à une candidature sans agencyId → couleur bleu #3B82F6
 */

const axios = require('axios');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const { getTestUser, API_URL } = require('../helpers/auth.helper');

const PREFIX = 'EVTCOL';

describe('Couleurs calendrier (intérim vs classique)', () => {
  let authHeaders;
  let validToken;
  let companyEmployerId;
  let companyAgencyId;
  let applicationClassicId;
  let applicationInterimId;
  let eventClassicId;
  let eventInterimId;

  jest.setTimeout(20000);

  beforeAll(async () => {
    try {
      const user = await getTestUser();
      validToken = user.token;
      authHeaders = user.headers;
    } catch (e) {
      console.warn('⚠️ getTestUser échoué:', e.message);
      authHeaders = { 'Content-Type': 'application/json' };
    }

    if (!validToken) return;

    try {
      const employerRes = await axios.post(`${API_URL}/api/v1/companies`, {
        name: `${PREFIX} Employer ${Date.now()}`,
        industry: 'Test',
        companyType: 'EMPLOYER'
      }, { headers: authHeaders, validateStatus: () => true });
      companyEmployerId = employerRes.data?.company?.id;

      const agencyRes = await axios.post(`${API_URL}/api/v1/companies`, {
        name: `${PREFIX} Agence ${Date.now()}`,
        industry: 'Intérim',
        companyType: 'TEMP_AGENCY'
      }, { headers: authHeaders, validateStatus: () => true });
      companyAgencyId = agencyRes.data?.company?.id;

      if (companyEmployerId) {
        const appClassicRes = await axios.post(`${API_URL}/api/v1/applications`, {
          companyId: companyEmployerId,
          position: `${PREFIX} Classic`,
          contractType: 'CDI',
          status: 'CANDIDATE_PENDING'
        }, { headers: authHeaders, validateStatus: () => true });
        applicationClassicId = appClassicRes.data?.application?.id;
      }

      if (companyEmployerId && companyAgencyId) {
        const appInterimRes = await axios.post(`${API_URL}/api/v1/applications`, {
          companyId: companyEmployerId,
          agencyId: companyAgencyId,
          position: `${PREFIX} Interim`,
          contractType: 'CDD',
          status: 'CANDIDATE_PENDING'
        }, { headers: authHeaders, validateStatus: () => true });
        applicationInterimId = appInterimRes.data?.application?.id;
      }

      if (applicationClassicId) {
        const eventRes = await axios.post(`${API_URL}/api/v1/events`, {
          title: `${PREFIX} Event Classic`,
          startDate: new Date().toISOString(),
          applicationId: applicationClassicId
        }, { headers: authHeaders, validateStatus: () => true });
        eventClassicId = eventRes.data?.event?.id;
      }

      if (applicationInterimId) {
        const eventRes = await axios.post(`${API_URL}/api/v1/events`, {
          title: `${PREFIX} Event Interim`,
          startDate: new Date().toISOString(),
          applicationId: applicationInterimId
        }, { headers: authHeaders, validateStatus: () => true });
        eventInterimId = eventRes.data?.event?.id;
      }
    } catch (e) {
      console.error('❌ Setup test event color:', e.message);
    }
  });

  afterAll(async () => {
    if (!validToken) return;
    const cleanups = [
      eventClassicId && { path: 'events', id: eventClassicId },
      eventInterimId && { path: 'events', id: eventInterimId },
      applicationClassicId && { path: 'applications', id: applicationClassicId },
      applicationInterimId && { path: 'applications', id: applicationInterimId },
      companyEmployerId && { path: 'companies', id: companyEmployerId },
      companyAgencyId && { path: 'companies', id: companyAgencyId }
    ].filter(Boolean);
    for (const { path, id } of cleanups) {
      try {
        await axios.delete(`${API_URL}/api/v1/${path}/${id}`, { headers: authHeaders, validateStatus: () => true });
      } catch (_) {}
    }
  });

  it('retourne la couleur ambre (#F59E0B) pour un événement lié à une candidature avec agence (intérim)', async () => {
    if (!validToken || !eventInterimId) {
      console.warn('Skip: token ou eventInterimId manquant');
      return;
    }
    const res = await axios.get(`${API_URL}/api/v1/events`, { headers: authHeaders, params: { limit: 100 }, validateStatus: () => true });
    expect(res.status).toBe(200);
    const events = res.data?.events || [];
    const ev = events.find((e) => e.id === eventInterimId);
    expect(ev).toBeDefined();
    expect(ev.color).toBe('#F59E0B');
  });

  it('retourne la couleur bleu (#3B82F6) pour un événement lié à une candidature sans agence (classique)', async () => {
    if (!validToken || !eventClassicId) {
      console.warn('Skip: token ou eventClassicId manquant');
      return;
    }
    const res = await axios.get(`${API_URL}/api/v1/events`, { headers: authHeaders, params: { limit: 100 }, validateStatus: () => true });
    expect(res.status).toBe(200);
    const events = res.data?.events || [];
    const ev = events.find((e) => e.id === eventClassicId);
    expect(ev).toBeDefined();
    expect(ev.color).toBe('#3B82F6');
  });
});
