/**
 * Module parcours utilisateur — Crash Reporting (route dediee gateway)
 *
 * Endpoint : POST /api/v1/crashes (sans auth, enregistrement fichier dans gateway)
 * Teste : envoi crash complet, minimal, validation crashType/message, acceptation sans auth
 */

const axios = require('axios');

const API_URL = process.env.API_URL || process.env.API_GATEWAY_URL || 'http://localhost:5002';
const GATEWAY_CRASH_URL = `${API_URL}/api/v1/crashes`;

async function stepCrashReporting(options = {}) {
  const apiUrl = API_URL;
  const stepResults = [];

  // 1. Envoi d'un crash report complet (sans auth)
  try {
    const crashData = {
      crashType: 'FlutterError',
      message: `Test crash via parcours utilisateur — ${new Date().toISOString()}`,
      stackTrace: 'at main.dart:42\nat home_screen.dart:128\nat framework.dart:4950',
      deviceInfo: {
        platform: 'android',
        osVersion: '14',
        deviceModel: 'Pixel 7',
        appVersion: '1.0.0',
        screenSize: '1080x2400',
        locale: 'fr_FR',
      },
      screenName: 'TestJourneyScreen',
      sessionId: `journey-${Date.now()}`,
      userActions: ['login', 'navigation home', 'open candidatures', 'crash triggered'],
      metadata: { source: 'user-journey-test', timestamp: Date.now() },
    };

    const res = await axios.post(GATEWAY_CRASH_URL, crashData, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });

    stepResults.push({
      step: 'envoi_crash_report_complet',
      success: res.status === 201 && res.data?.success === true && res.data?.file,
      status: res.status,
      file: res.data?.file || null,
      detail: res.status === 201 ? 'Crash report enregistre (gateway)' : `Erreur: ${res.status}`,
    });
  } catch (e) {
    stepResults.push({
      step: 'envoi_crash_report_complet',
      success: false,
      detail: `Exception: ${e.message}`,
    });
  }

  // 2. Envoi d'un crash report minimal
  try {
    const res = await axios.post(
      GATEWAY_CRASH_URL,
      { crashType: 'MinimalJourney', message: 'Test minimal' },
      { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
    );

    stepResults.push({
      step: 'envoi_crash_minimal',
      success: res.status === 201 && res.data?.file,
      status: res.status,
    });
  } catch (e) {
    stepResults.push({ step: 'envoi_crash_minimal', success: false, detail: e.message });
  }

  // 3. Envoi sans crashType (doit echouer 400)
  try {
    const res = await axios.post(
      GATEWAY_CRASH_URL,
      { message: 'Missing type' },
      { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
    );

    stepResults.push({
      step: 'validation_crashType_requis',
      success: res.status === 400,
      status: res.status,
      detail: res.status === 400 ? 'Validation OK: crashType requis' : 'Validation echouee',
    });
  } catch (e) {
    stepResults.push({ step: 'validation_crashType_requis', success: false, detail: e.message });
  }

  // 4. Envoi sans auth doit reussir (gateway accepte sans token)
  try {
    const res = await axios.post(
      GATEWAY_CRASH_URL,
      { crashType: 'NoAuth', message: 'Accepte sans token' },
      { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
    );

    stepResults.push({
      step: 'accepte_sans_auth',
      success: res.status === 201 && res.data?.success === true,
      status: res.status,
      detail: res.status === 201 ? 'Gateway accepte sans authentification : OK' : `Attendu 201, obtenu ${res.status}`,
    });
  } catch (e) {
    stepResults.push({ step: 'accepte_sans_auth', success: false, detail: e.message });
  }

  // 5. Types multiples
  try {
    const types = ['UncaughtError', 'NetworkError', 'TimeoutError'];
    let allOk = true;
    for (const crashType of types) {
      const res = await axios.post(
        GATEWAY_CRASH_URL,
        { crashType, message: `Journey test: ${crashType}` },
        { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
      );
      if (res.status !== 201) allOk = false;
    }

    stepResults.push({
      step: 'types_multiples',
      success: allOk,
      detail: allOk ? '3 types envoyes avec succes' : 'Certains types ont echoue',
    });
  } catch (e) {
    stepResults.push({ step: 'types_multiples', success: false, detail: e.message });
  }

  return {
    module: 'crash_reporting',
    steps: stepResults,
    passed: stepResults.filter((s) => s.success).length,
    failed: stepResults.filter((s) => !s.success).length,
    total: stepResults.length,
  };
}

module.exports = { stepCrashReporting };
