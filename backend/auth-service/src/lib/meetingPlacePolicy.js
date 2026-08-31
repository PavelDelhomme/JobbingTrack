/**
 * Politique lieu / lien d’entretien (présentiel vs tél/visio) + extraction invite email.
 * Utilisé par l’agent email (Calendar) et aligné conceptuellement avec le mobile Flutter.
 */

const NORMALIZE_RE = /[\u0300-\u036f]/g;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(NORMALIZE_RE, '')
    .toLowerCase();
}

const VIDEO_HOST_RE =
  /(?:https?:\/\/)?(?:[\w.-]+\.)?(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com|teams\.live\.com|webex\.com|whereby\.com|around\.co|discord\.gg|jitsi\.|facetime\.apple\.com)[^\s<>"']*/gi;

const CALENDAR_INVITE_RE =
  /(?:https?:\/\/)?(?:calendar\.google\.com\/[^\s<>"']+|outlook\.office(?:365)?\.com\/[^\s<>"']*calendar[^\s<>"']*|outlook\.live\.com\/[^\s<>"']*calendar[^\s<>"']*)/gi;

const ICS_LINK_RE = /https?:\/\/[^\s<>"']+\.ics(?:\?[^\s<>"']*)?/gi;

const PHONE_RE =
  /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{2,4}(?:[\s.-]?\d{2}){2,4}/g;

const ADDRESS_HINT_RE =
  /\b(?:rue|avenue|av\.|bd|boulevard|place|impasse|chemin|route|all[eé]e|cs\b|cedex|building|étage|etage|bureau|salle)\b/i;

/**
 * @returns {'presentiel'|'visio'|'telephone'|'hybride'|'inconnu'}
 */
function detectMeetingModality({ location, videoLink, text } = {}) {
  const loc = String(location || '').trim();
  const video = String(videoLink || '').trim();
  const blob = normalizeText([loc, video, text].filter(Boolean).join(' '));

  const hasVideo =
    Boolean(video)
    || VIDEO_HOST_RE.test(blob)
    || /\b(visio|visioconference|teams|zoom|meet|webex|distanciel|en ligne)\b/.test(blob);
  VIDEO_HOST_RE.lastIndex = 0;

  const phoneOnly =
    loc
    && !ADDRESS_HINT_RE.test(loc)
    && !VIDEO_HOST_RE.test(loc)
    && (() => {
      const digits = loc.replace(/\D/g, '');
      return digits.length >= 8 && digits.length <= 15 && /^[\d\s.()+-]+$/.test(loc);
    })();
  VIDEO_HOST_RE.lastIndex = 0;

  const hasPhone =
    phoneOnly
    || /\b(telephone|appel|par tel|appel telephonique|call)\b/.test(blob);

  const hasAddress =
    Boolean(loc)
    && !phoneOnly
    && (ADDRESS_HINT_RE.test(loc) || /\d{5}/.test(loc) || loc.includes(','));

  if (hasVideo && (hasAddress || hasPhone)) return 'hybride';
  if (hasVideo) return 'visio';
  if (hasPhone && !hasAddress) return 'telephone';
  if (hasAddress) return 'presentiel';
  if (/\bpresentiel\b/.test(blob)) return 'presentiel';
  if (/\bdistanciel\b/.test(blob)) return 'visio';
  return 'inconnu';
}

function modalityLabelFr(modality) {
  switch (modality) {
    case 'presentiel':
      return 'Présentiel';
    case 'visio':
      return 'Visioconférence (pas en présentiel)';
    case 'telephone':
      return 'Téléphone (pas en présentiel)';
    case 'hybride':
      return 'Hybride';
    default:
      return 'À préciser';
  }
}

function extractUrls(text, regex) {
  const out = [];
  const seen = new Set();
  const src = String(text || '');
  let match;
  const re = new RegExp(regex.source, regex.flags);
  while ((match = re.exec(src)) !== null) {
    let url = match[0].replace(/[),.;]+$/, '');
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

function extractMeetingArtifacts(text) {
  const raw = String(text || '');
  const videoLinks = extractUrls(raw, VIDEO_HOST_RE);
  const inviteLinks = [
    ...extractUrls(raw, CALENDAR_INVITE_RE),
    ...extractUrls(raw, ICS_LINK_RE),
  ];
  const phones = [];
  const phoneRe = new RegExp(PHONE_RE.source, 'g');
  let m;
  while ((m = phoneRe.exec(raw)) !== null) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) phones.push(m[0].trim());
  }

  return {
    videoLinks,
    inviteLinks,
    phones: [...new Set(phones)].slice(0, 5),
    primaryVideoLink: videoLinks[0] || null,
    primaryInviteLink: inviteLinks[0] || null,
  };
}

function detectBilanDeCompetences(text) {
  const n = normalizeText(text);
  return (
    n.includes('bilan de competence')
    || n.includes('bilan de compétences')
    || n.includes('bilan competences')
    || n.includes('cep ')
    || n.includes('conseiller en evolution')
    || n.includes('accompagnement professionnel')
    || (n.includes('bilan') && n.includes('competence'))
  );
}

/**
 * Heuristique « qui propose » depuis From + corps (recruteur vs organisme bilan).
 */
function inferProposer({ from, subject, body } = {}) {
  const fromStr = String(from || '').trim();
  const blob = `${fromStr}\n${subject || ''}\n${body || ''}`;
  const isBilan = detectBilanDeCompetences(blob);

  let kind = 'recruteur';
  if (isBilan) kind = 'organisme_bilan';
  else if (/cabinet|rh\b|talent|recruit/i.test(fromStr)) kind = 'cabinet_rh';

  const emailMatch = fromStr.match(/[\w.+-]+@[\w.-]+\.\w+/);
  const nameMatch = fromStr.match(/^"?([^"<]+)"?\s*</);
  const displayName = (nameMatch?.[1] || fromStr.split('@')[0] || '').trim();

  return {
    kind,
    labelFr:
      kind === 'organisme_bilan'
        ? 'Organisme / conseiller (bilan de compétences)'
        : kind === 'cabinet_rh'
          ? 'Cabinet / RH'
          : 'Recruteur / entreprise',
    displayName: displayName || null,
    email: emailMatch?.[0] || null,
    isBilanDeCompetences: isBilan,
  };
}

function buildInterviewEventPayload({
  from,
  subject,
  body,
  snippet,
  location,
  videoLink,
  titleOverride,
} = {}) {
  const text = [subject, snippet, body].filter(Boolean).join('\n');
  const artifacts = extractMeetingArtifacts(text);
  const modality = detectMeetingModality({
    location: location || artifacts.phones[0],
    videoLink: videoLink || artifacts.primaryVideoLink,
    text,
  });
  const proposer = inferProposer({ from, subject, body: text });

  const resolvedVideo = videoLink || artifacts.primaryVideoLink || null;
  const resolvedLocation =
    modality === 'telephone'
      ? (location || artifacts.phones[0] || null)
      : modality === 'visio'
        ? (resolvedVideo || location || null)
        : (location || null);

  const descriptionParts = [
    proposer.isBilanDeCompetences
      ? 'Type : bilan de compétences (pas un entretien d’embauche classique).'
      : null,
    `Format : ${modalityLabelFr(modality)}`,
    proposer.displayName ? `Proposant : ${proposer.displayName} (${proposer.labelFr})` : `Proposant : ${proposer.labelFr}`,
    proposer.email ? `Contact : ${proposer.email}` : null,
    artifacts.primaryInviteLink ? `Lien invitation agenda : ${artifacts.primaryInviteLink}` : null,
    resolvedVideo ? `Lien visio : ${resolvedVideo}` : null,
    snippet || null,
  ].filter(Boolean);

  const titleBase = proposer.isBilanDeCompetences
    ? 'Bilan de compétences'
    : 'Entretien';

  return {
    modality,
    modalityLabelFr: modalityLabelFr(modality),
    isPresentiel: modality === 'presentiel' || modality === 'hybride',
    proposer,
    artifacts,
    title: (titleOverride || `${titleBase} — ${subject || ''}`.trim()).slice(0, 120),
    location: resolvedLocation,
    videoLink: resolvedVideo,
    inviteLink: artifacts.primaryInviteLink,
    description: descriptionParts.join('\n').slice(0, 4000),
  };
}

module.exports = {
  detectMeetingModality,
  modalityLabelFr,
  extractMeetingArtifacts,
  detectBilanDeCompetences,
  inferProposer,
  buildInterviewEventPayload,
};
