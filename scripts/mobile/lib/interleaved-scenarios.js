/**
 * Source unique des scénarios entremêlés (seed + smoke).
 * Ajouter un scénario ici : pas de logique dupliquée par entreprise dans les scripts.
 */

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysAhead(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

/** @typedef {'application'|'standalone_contact'} ScenarioKind */

/**
 * @typedef {Object} ScenarioExpect
 * @property {string} [statusIncludes] — fragment attendu dans le statut normalisé
 * @property {number} [minContacts]
 * @property {number} [maxContacts]
 * @property {number} [minInterviews]
 * @property {number} [maxInterviews]
 * @property {number} [minFollowups]
 * @property {number} [maxFollowups]
 * @property {number} [minCalls]
 * @property {number} [maxCalls]
 * @property {boolean} [callsWithContact] — au moins un appel lié à un contact
 * @property {boolean} [callsWithoutContact] — au moins un appel sans contactId
 * @property {{ subjectIncludes?: string, linkFollowUpIndex?: number }} [callMatch]
 */

const INTERLEAVED_SCENARIOS = [
  {
    id: 'capgemini',
    label: 'Capgemini',
    kind: 'application',
    match: { company: 'Capgemini', position: 'Full Stack' },
    application: {
      position: 'Développeur Full Stack',
      companyName: 'Capgemini',
      status: 'AWAITING_INTERVIEW',
      applicationDate: daysAgo(18),
      location: 'Paris La Défense',
      notes: 'Candidature via LinkedIn — profil Java/React',
    },
    contact: {
      firstName: 'Marie',
      lastName: 'Dupont',
      email: 'marie.dupont@capgemini.com',
      phone: '+33 6 12 34 56 01',
      position: 'Chargée de recrutement IT',
    },
    linkContact: true,
    interviews: [
      {
        interviewDate: daysAhead(5),
        notes: '[Format: Distanciel]\nEntretien RH puis technique',
        location: 'Visio Teams',
      },
    ],
    followups: [{ followUpDate: daysAgo(10), notes: 'Relance après envoi CV — réponse positive' }],
    calls: [
      {
        callDate: daysAgo(12),
        subject: 'Premier échange RH',
        notes: '15 min — créneaux entretien proposés',
        withContact: true,
      },
    ],
    expect: {
      minContacts: 1,
      minInterviews: 1,
      minFollowups: 1,
      minCalls: 1,
      callsWithContact: true,
    },
    seedSummary: 'entretien + relance + appel contact',
  },
  {
    id: 'orange',
    label: 'Orange',
    kind: 'application',
    match: { company: 'Orange', position: 'Ingénieur' },
    application: {
      position: 'Ingénieur réseau',
      companyName: 'Orange',
      status: 'NO_RESPONSE',
      applicationDate: daysAgo(35),
      location: 'Rennes',
      notes: 'Offre site careers.orange.com',
    },
    contact: {
      firstName: 'Thomas',
      lastName: 'Bernard',
      email: 'thomas.bernard@orange.com',
      phone: '+33 6 98 76 54 32',
      position: 'Responsable recrutement',
    },
    linkContact: true,
    followups: [
      { followUpDate: daysAgo(21), notes: 'Relance email n°1 — pas de réponse' },
      { followUpDate: daysAgo(7), notes: 'Relance email n°2 — toujours silence' },
    ],
    calls: [
      {
        callDate: daysAgo(5),
        subject: 'Appel de relance téléphonique',
        notes: 'Messagerie — rappel prévu',
        withContact: true,
        linkFollowUpIndex: 1,
      },
    ],
    expect: {
      minFollowups: 2,
      minCalls: 1,
      callMatch: { subjectIncludes: 'relance' },
    },
    seedSummary: '2 relances + appel relance lié',
  },
  {
    id: 'thales',
    label: 'Thales',
    kind: 'application',
    match: { company: 'Thales', position: 'DevOps' },
    application: {
      position: 'DevOps Engineer',
      companyName: 'Thales',
      status: 'AWAITING_INTERVIEW',
      applicationDate: daysAgo(8),
      location: 'Velizy-Villacoublay',
      notes: 'Recommandation ex-collègue',
    },
    interviews: [
      {
        interviewDate: daysAhead(2),
        notes: '[Format: Présentiel]\nEntretien manager',
        location: 'Site Thales Velizy',
      },
    ],
    expect: {
      minInterviews: 1,
      maxFollowups: 0,
    },
    seedSummary: 'entretien sans relance',
  },
  {
    id: 'atos',
    label: 'Atos',
    kind: 'application',
    match: { company: 'Atos', position: 'Consultant' },
    application: {
      position: 'Consultant SI',
      companyName: 'Atos',
      status: 'REJECTED_WITHOUT_INTERVIEW',
      applicationDate: daysAgo(45),
      location: 'Lyon',
      notes: 'Refus reçu par email après 3 semaines',
    },
    expect: {
      statusIncludes: 'REJECTED',
      maxInterviews: 0,
      maxFollowups: 0,
      maxCalls: 0,
    },
    seedSummary: 'refusée sans suite',
  },
  {
    id: 'sopra',
    label: 'Sopra Steria',
    kind: 'application',
    match: { company: 'Sopra', position: 'Lead Developer' },
    application: {
      position: 'Lead Developer Java',
      companyName: 'Sopra Steria',
      status: 'CANDIDATE_PENDING',
      applicationDate: daysAgo(14),
      location: 'Bordeaux',
      notes: 'Candidature spontanée',
    },
    calls: [
      {
        callDate: daysAgo(3),
        subject: 'Appel standard accueil entreprise',
        notes: 'Orientation vers service RH — pas de contact direct',
        withContact: false,
      },
    ],
    expect: {
      minCalls: 1,
      callsWithoutContact: true,
    },
    seedSummary: 'appel sans contact',
  },
  {
    id: 'dassault',
    label: 'Dassault',
    kind: 'application',
    match: { company: 'Dassault', position: 'Architecte' },
    application: {
      position: 'Architecte Cloud AWS',
      companyName: 'Dassault Systèmes',
      status: 'CANDIDATE_PENDING',
      applicationDate: daysAgo(5),
      location: 'Vélizy',
      notes: 'Profil cloud / Kubernetes',
    },
    contact: {
      firstName: 'Sophie',
      lastName: 'Martin',
      email: 'sophie.martin@3ds.com',
      phone: '+33 6 11 22 33 44',
      position: 'Talent Acquisition',
    },
    linkContact: true,
    expect: {
      minContacts: 1,
      maxCalls: 0,
    },
    seedSummary: 'contact lié, pas encore d’appel',
  },
  {
    id: 'ovh',
    label: 'OVHcloud',
    kind: 'application',
    match: { company: 'OVHcloud', position: 'SRE' },
    application: {
      position: 'SRE Platform Engineer',
      companyName: 'OVHcloud',
      status: 'CANDIDATE_PENDING',
      applicationDate: daysAgo(22),
      location: 'Roubaix',
      notes: 'Aligné stack interne — candidatures@delhomme.ovh',
    },
    followups: [
      { followUpDate: daysAgo(15), notes: 'Relance J+7' },
      { followUpDate: daysAgo(8), notes: 'Relance J+14' },
    ],
    expect: {
      minFollowups: 2,
      maxCalls: 0,
    },
    seedSummary: '2 relances sans appel',
  },
  {
    id: 'luc-petit',
    label: 'Contact autonome Luc Petit (Capgemini)',
    kind: 'standalone_contact',
    contact: {
      firstName: 'Luc',
      lastName: 'Petit',
      email: 'luc.petit@capgemini.com',
      phone: '+33 6 55 44 33 22',
      position: 'Directeur technique',
    },
    companyRef: 'capgemini',
    seedSummary: 'sans nouvelle candidature',
  },
];

const GLOBAL_EXPECT = {
  minCompanies: 5,
  minCalendarEvents: 1,
  minTotalCalls: 3,
};

function findApp(apps, { company, position }) {
  return apps.find((a) => {
    const co = (a.company?.name || a.companyName || '').toLowerCase();
    const pos = (a.position || a.title || '').toLowerCase();
    return co.includes(company.toLowerCase()) && pos.includes(position.toLowerCase());
  });
}

function normalizeApplicationStatus(status) {
  if (typeof status === 'string') return status;
  if (status && typeof status === 'object' && status.code) return String(status.code);
  return String(status ?? '');
}

function countFollowups(payload) {
  return payload.followups?.length ?? payload.followUps?.length ?? 0;
}

function callHasContact(call) {
  return Boolean(call.contactId || call.contact?.id);
}

async function seedScenario(scenario, ctx) {
  const { api, createApplication, createContact, linkContact, createFollowUp, createInterview, createCall, linkCallToFollowUp } = ctx;

  if (scenario.kind === 'standalone_contact') {
    const ref = ctx.seeded[scenario.companyRef];
    if (!ref?.companyId) throw new Error(`companyRef ${scenario.companyRef} introuvable pour ${scenario.id}`);
    await createContact({ ...scenario.contact, companyId: ref.companyId });
    return { companyId: ref.companyId };
  }

  const app = await createApplication(scenario.application);
  const result = { id: app.id, companyId: app.companyId, followUpIds: [] };
  let contactId = null;

  if (scenario.contact) {
    const contact = await createContact({ ...scenario.contact, companyId: app.companyId });
    contactId = contact.id;
    if (scenario.linkContact) await linkContact(contactId, app.id);
  }

  for (const iv of scenario.interviews || []) {
    await createInterview(app.id, iv.interviewDate, iv.notes, iv.location);
  }

  for (const fu of scenario.followups || []) {
    const created = await createFollowUp(app.id, fu.followUpDate, fu.notes);
    result.followUpIds.push(created.id);
  }

  for (const callDef of scenario.calls || []) {
    const call = await createCall({
      applicationId: app.id,
      callDate: callDef.callDate,
      subject: callDef.subject,
      notes: callDef.notes,
      contactId: callDef.withContact ? contactId : undefined,
      companyId: callDef.withContact ? undefined : app.companyId,
    });
    if (callDef.linkFollowUpIndex != null && result.followUpIds[callDef.linkFollowUpIndex]) {
      await linkCallToFollowUp(call.id, result.followUpIds[callDef.linkFollowUpIndex]);
    }
  }

  return result;
}

async function verifyScenario(scenario, ctx) {
  const { apps, pass, fail, api, interviewsCache, contactsCache } = ctx;

  if (scenario.kind === 'standalone_contact') {
    const contacts = contactsCache || (await api('GET', '/api/v1/contacts?limit=200')).data.contacts || [];
    const hit = contacts.find(
      (c) =>
        (c.firstName || '').toLowerCase() === scenario.contact.firstName.toLowerCase() &&
        (c.lastName || '').toLowerCase() === scenario.contact.lastName.toLowerCase(),
    );
    if (hit) pass(scenario.label, hit.id);
    else fail(scenario.label, 'introuvable');
    return;
  }

  const app = findApp(apps, scenario.match);
  const prefix = scenario.label;
  const expect = scenario.expect || {};

  if (!app?.id) {
    fail(`${prefix} — candidature seed`, 'introuvable — lancer seed-realistic-user-data-api.js');
    return;
  }
  pass(`${prefix} — candidature seed`, app.id);

  if (expect.statusIncludes) {
    const st = normalizeApplicationStatus(app.status);
    if (st.includes(expect.statusIncludes)) pass(`${prefix} — statut ${expect.statusIncludes}`, st);
    else fail(`${prefix} — statut ${expect.statusIncludes}`, st || 'statut inattendu');
  }

  if (expect.minContacts != null || expect.maxContacts != null) {
    const contactsRes = await api('GET', `/api/v1/contacts/application/${app.id}`);
    const n = contactsRes.data.contacts?.length ?? contactsRes.data.total ?? 0;
    if (contactsRes.status !== 200) fail(`${prefix} — contacts`, `${contactsRes.status}`);
    else if (expect.minContacts != null && n < expect.minContacts) fail(`${prefix} — contacts`, `attendu >=${expect.minContacts}, trouvé ${n}`);
    else if (expect.maxContacts != null && n > expect.maxContacts) fail(`${prefix} — contacts`, `attendu <=${expect.maxContacts}, trouvé ${n}`);
    else pass(`${prefix} — contacts`, `${n} contact(s)`);
  }

  if (expect.minInterviews != null || expect.maxInterviews != null) {
    const interviews = interviewsCache || (await api('GET', '/api/v1/interviews?limit=200')).data.interviews || [];
    const n = interviews.filter((i) => i.applicationId === app.id).length;
    if (expect.minInterviews != null && n < expect.minInterviews) fail(`${prefix} — entretiens`, `attendu >=${expect.minInterviews}, trouvé ${n}`);
    else if (expect.maxInterviews != null && n > expect.maxInterviews) fail(`${prefix} — entretiens`, `attendu <=${expect.maxInterviews}, trouvé ${n}`);
    else pass(`${prefix} — entretiens`, `${n}`);
  }

  if (expect.minFollowups != null || expect.maxFollowups != null) {
    const followups = await api('GET', `/api/v1/followups?applicationId=${app.id}&limit=50`);
    const n = countFollowups(followups.data);
    if (followups.status !== 200) fail(`${prefix} — relances`, `${followups.status}`);
    else if (expect.minFollowups != null && n < expect.minFollowups) fail(`${prefix} — relances`, `attendu >=${expect.minFollowups}, trouvé ${n}`);
    else if (expect.maxFollowups != null && n > expect.maxFollowups) fail(`${prefix} — relances`, `attendu <=${expect.maxFollowups}, trouvé ${n}`);
    else pass(`${prefix} — relances`, `${n}`);
  }

  if (
    expect.minCalls != null ||
    expect.maxCalls != null ||
    expect.callsWithContact ||
    expect.callsWithoutContact ||
    expect.callMatch
  ) {
    const callsRes = await api('GET', `/api/v1/calls/application/${app.id}`);
    const callList = callsRes.data.calls || [];
    const n = callList.length;

    if (callsRes.status !== 200) {
      fail(`${prefix} — appels`, `${callsRes.status}`);
      return;
    }

    if (expect.minCalls != null && n < expect.minCalls) {
      fail(`${prefix} — appels`, `attendu >=${expect.minCalls}, trouvé ${n}`);
      return;
    }
    if (expect.maxCalls != null && n > expect.maxCalls) {
      fail(`${prefix} — appels`, `attendu <=${expect.maxCalls}, trouvé ${n}`);
      return;
    }

    if (expect.callsWithContact && !callList.some(callHasContact)) {
      fail(`${prefix} — appel avec contact`, `calls=${n}`);
      return;
    }
    if (expect.callsWithoutContact && !callList.some((c) => !callHasContact(c))) {
      fail(`${prefix} — appel sans contact`, `calls=${n}`);
      return;
    }

    if (expect.callMatch) {
      const { subjectIncludes } = expect.callMatch;
      const hit = callList.find((c) =>
        subjectIncludes ? (c.subject || '').toLowerCase().includes(subjectIncludes.toLowerCase()) : true,
      );
      if (hit) pass(`${prefix} — appel (${subjectIncludes || 'match'})`, hit.subject || hit.id);
      else fail(`${prefix} — appel (${subjectIncludes || 'match'})`, `calls=${n}`);
      return;
    }

    if (expect.minCalls != null || expect.maxCalls != null) pass(`${prefix} — appels`, `${n}`);
  }
}

async function verifyGlobalExpect(ctx) {
  const { pass, fail, api, apps } = ctx;
  const { minCompanies, minCalendarEvents, minTotalCalls } = GLOBAL_EXPECT;

  const companiesRes = await api('GET', '/api/v1/companies?limit=200');
  const coList = companiesRes.data.companies || [];
  const companyNamesFromApps = new Set(
    (apps || [])
      .map((a) => a.company?.name || a.companyName)
      .filter(Boolean),
  );
  const companyCount = coList.length > 0 ? coList.length : companyNamesFromApps.size;

  if (companyCount >= minCompanies) {
    pass('Entreprises listées', `${companyCount}`);
  } else {
    fail('Entreprises listées', `${companiesRes.status} n=${companyCount}`);
  }

  const events = await api('GET', '/api/v1/events?limit=50');
  const evCount = events.data.events?.length ?? 0;
  if (events.status === 200 && evCount >= minCalendarEvents) pass('Calendrier / événements agrégés', `${evCount} événement(s)`);
  else if (events.status === 200) fail('Calendrier / événements', '0 événement — entretiens/relances non agrégés ?');
  else fail('Calendrier / événements', `${events.status}`);

  const callsAll = await api('GET', '/api/v1/calls?limit=100');
  const callsCount = callsAll.data.calls?.length ?? 0;
  if (callsAll.status === 200 && callsCount >= minTotalCalls) pass('Appels globaux', `${callsCount} appel(s)`);
  else fail('Appels globaux', `${callsCount} appel(s)`);
}

module.exports = {
  INTERLEAVED_SCENARIOS,
  GLOBAL_EXPECT,
  findApp,
  normalizeApplicationStatus,
  seedScenario,
  verifyScenario,
  verifyGlobalExpect,
};
