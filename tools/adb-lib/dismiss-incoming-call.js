/**
 * Ignore les appels téléphoniques entrants pendant les smokes ADB.
 * Refuse l'appel (jamais « Répondre ») et ramène JobbingTrack au premier plan.
 *
 * Activé par défaut si SMOKE_IGNORE_INCOMING_CALLS !== '0'.
 */

const JOBINGTRACK_PKG = 'com.example.jobbingtrack_mobile';

const INCOMING_PACKAGES = [
  'com.android.incallui',
  'com.samsung.android.incallui',
  'com.google.android.dialer',
  'com.android.dialer',
  'com.samsung.android.dialer',
];

const DECLINE_LABELS = [
  'Refuser',
  'Decline',
  'Raccrocher',
  'Rejeter',
  'Reject',
  'REFUSE',
  'Ignorer',
  'Dismiss',
];

function smokeIgnoreIncomingCallsEnabled() {
  const raw = process.env.SMOKE_IGNORE_INCOMING_CALLS;
  if (raw === '0' || raw === 'false') return false;
  return true;
}

function xmlLooksLikeIncomingCall(xml) {
  const lower = String(xml || '').toLowerCase();
  if (!lower) return false;

  if (INCOMING_PACKAGES.some((pkg) => lower.includes(pkg))) {
    if (
      lower.includes('incoming') ||
      lower.includes('entrant') ||
      lower.includes('appel entrant') ||
      lower.includes('ringing')
    ) {
      return true;
    }
    const hasAnswer =
      lower.includes('répondre') ||
      lower.includes('answer call') ||
      lower.includes('content-desc="answer"');
    const hasDecline = DECLINE_LABELS.some((l) => lower.includes(l.toLowerCase()));
    if (hasAnswer && hasDecline) return true;
  }

  const hasAnswerUi =
    lower.includes('répondre') ||
    lower.includes('answer call') ||
    (lower.includes('answer') && lower.includes('decline'));
  const hasDeclineUi = DECLINE_LABELS.some((l) => lower.includes(l.toLowerCase()));
  if (hasAnswerUi && hasDeclineUi && !lower.includes('nouvel appel')) {
    return true;
  }

  return false;
}

async function shellEndCall(adb) {
  try {
    await adb.shellCommand('input keyevent 6');
  } catch {
    /* ENDCALL indisponible */
  }
  try {
    await adb.shellCommand('cmd telecom end-call');
  } catch {
    /* API telecom absente */
  }
}

async function bringJobbingTrackToFront(adb) {
  try {
    await adb.shellCommand(
      `am start -n ${JOBINGTRACK_PKG}/.MainActivity`,
    );
  } catch {
    /* ignore */
  }
}

/**
 * Détecte et refuse un appel entrant système. Ne répond jamais à l'appel.
 * @returns {boolean} true si un overlay appel a été traité
 */
async function dismissIncomingPhoneCall(adb, { log = true } = {}) {
  if (!smokeIgnoreIncomingCallsEnabled()) return false;

  let xml = '';
  try {
    xml = await adb.uiDump(true);
  } catch {
    return false;
  }

  if (!xmlLooksLikeIncomingCall(xml)) {
    return false;
  }

  if (log && adb._log) {
    adb._log('appel entrant détecté — refus automatique (smoke)');
  }

  for (const label of DECLINE_LABELS) {
    if (!xml.toLowerCase().includes(label.toLowerCase())) continue;
    try {
      const r = await adb._post('/find-and-tap', { text: label, index: 0 });
      if (r.success) {
        adb._invalidateUi?.();
        await adb.wait(400);
        await bringJobbingTrackToFront(adb);
        await adb.wait(500);
        return true;
      }
    } catch {
      /* essai suivant */
    }
  }

  await shellEndCall(adb);
  await adb.wait(400);
  await bringJobbingTrackToFront(adb);
  await adb.wait(500);
  adb._invalidateUi?.();
  return true;
}

module.exports = {
  dismissIncomingPhoneCall,
  xmlLooksLikeIncomingCall,
  smokeIgnoreIncomingCallsEnabled,
};
