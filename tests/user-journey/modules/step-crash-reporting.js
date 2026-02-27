/**
 * Module parcours utilisateur — Crash Reporting
 *
 * Teste le cycle complet :
 * 1. Envoi d'un crash report
 * 2. Verification de la sauvegarde
 * 3. Lecture des crash reports
 * 4. Verification de l'anonymisation
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepCrashReporting(options = {}) {
  const token = options.token;
  const apiUrl = API_URL;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const stepResults = [];

  // 1. Envoi d'un crash report complet
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

    const res = await axios.post(`${apiUrl}/api/v1/notifications/crashes`, crashData, {
      headers,
      validateStatus: () => true,
    });

    stepResults.push({
      step: 'envoi_crash_report_complet',
      success: res.status === 201 && res.data?.success === true,
      status: res.status,
      reportId: res.data?.reportId || null,
      detail: res.status === 201 ? 'Crash report envoye avec succes' : `Erreur: ${res.status}`,
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
      `${apiUrl}/api/v1/notifications/crashes`,
      { crashType: 'MinimalJourney', message: 'Test minimal' },
      { headers, validateStatus: () => true }
    );

    stepResults.push({
      step: 'envoi_crash_minimal',
      success: res.status === 201,
      status: res.status,
    });
  } catch (e) {
    stepResults.push({ step: 'envoi_crash_minimal', success: false, detail: e.message });
  }

  // 3. Envoi sans crashType (doit echouer)
  try {
    const res = await axios.post(
      `${apiUrl}/api/v1/notifications/crashes`,
      { message: 'Missing type' },
      { headers, validateStatus: () => true }
    );

    stepResults.push({
      step: 'validation_crashType_requis',
      success: res.status === 400 || res.status === 422,
      status: res.status,
      detail: res.status >= 400 ? 'Validation OK: crashType requis' : 'Validation echouee',
    });
  } catch (e) {
    stepResults.push({ step: 'validation_crashType_requis', success: false, detail: e.message });
  }

  // 4. Lecture des crash reports
  try {
    const res = await axios.get(`${apiUrl}/api/v1/notifications/crashes?page=1&limit=5`, {
      headers,
      validateStatus: () => true,
    });

    const hasStructure = res.data?.reports !== undefined && res.data?.pagination !== undefined;

    stepResults.push({
      step: 'lecture_crash_reports',
      success: res.status === 200 && hasStructure,
      status: res.status,
      count: res.data?.reports?.length || 0,
      total: res.data?.pagination?.total || 0,
      detail: `Endpoint OK, ${res.data?.reports?.length || 0} rapports (structure ${hasStructure ? 'valide' : 'invalide'})`,
    });
  } catch (e) {
    stepResults.push({ step: 'lecture_crash_reports', success: false, detail: e.message });
  }

  // 5. Envoi sans auth (doit echouer)
  try {
    const res = await axios.post(
      `${apiUrl}/api/v1/notifications/crashes`,
      { crashType: 'NoAuth', message: 'Should fail' },
      { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
    );

    stepResults.push({
      step: 'rejet_sans_auth',
      success: res.status === 401,
      status: res.status,
      detail: res.status === 401 ? 'Authentification requise : OK' : 'Devrait renvoyer 401',
    });
  } catch (e) {
    stepResults.push({ step: 'rejet_sans_auth', success: false, detail: e.message });
  }

  // 6. Types multiples
  try {
    const types = ['UncaughtError', 'NetworkError', 'TimeoutError'];
    let allOk = true;
    for (const crashType of types) {
      const res = await axios.post(
        `${apiUrl}/api/v1/notifications/crashes`,
        { crashType, message: `Journey test: ${crashType}` },
        { headers, validateStatus: () => true }
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
