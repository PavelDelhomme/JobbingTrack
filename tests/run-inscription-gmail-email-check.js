#!/usr/bin/env node
/**
 * Test automatisé : Inscription Gmail (redacted@example.invalid) via API
 * puis vérification que l'email de vérification est bien loggé et envoyé à la bonne adresse.
 *
 * Usage: node tests/run-inscription-gmail-email-check.js
 * Prérequis: API gateway + auth-service démarrés (ex: make up-full ou docker-compose up -d)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_URL = process.env.API_GATEWAY_URL || process.env.API_URL || 'http://localhost:5002';
// Email unique à chaque run (normalizeEmail() sur /register peut enlever le +xxx de Gmail → 409)
const GMAIL_EMAIL = process.env.TEST_GMAIL_EMAIL || `jt-inscription-${Date.now()}@jobbingtrack.test`;
const GMAIL_PASSWORD = 'password123';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@jobbingtrack.test';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'password123';

const outPath = path.join(__dirname, 'results', 'inscription-gmail-check.log');
function log(msg) {
  const line = typeof msg === 'string' ? msg : JSON.stringify(msg);
  console.log(line);
  try {
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(outPath, line + '\n');
  } catch (_) {}
}

async function main() {
  let adminToken;
  log('=== Test Inscription Gmail + vérif. email loggé ===');
  log('API_URL: ' + API_URL);
  log('Email cible: ' + GMAIL_EMAIL);

  try {
    // 1) Login admin pour pouvoir lire les logs
    log('1) Connexion admin...');
    const loginRes = await axios.post(`${API_URL}/api/v1/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }, { validateStatus: () => true, timeout: 10000 });

    if (loginRes.status !== 200 || !loginRes.data?.token) {
      log('   Échec login admin: ' + loginRes.status);
      process.exitCode = 1;
      return;
    }
    adminToken = loginRes.data.token;
    log('   OK');

    // 2) Inscription Gmail (201 = créé, 409 = déjà existant)
    log('2) Inscription ' + GMAIL_EMAIL + ' ...');
    const registerRes = await axios.post(`${API_URL}/api/v1/auth/register`, {
      email: GMAIL_EMAIL,
      password: GMAIL_PASSWORD,
      firstName: 'Test',
      lastName: 'Gmail',
    }, { validateStatus: () => true, timeout: 10000 });

    if (registerRes.status !== 201 && registerRes.status !== 200 && registerRes.status !== 409) {
      log('   Échec inscription: ' + registerRes.status);
      process.exitCode = 1;
      return;
    }
    log('   Status: ' + registerRes.status + (registerRes.status === 409 ? ' (compte déjà existant)' : ' (créé)'));

    // 3) Attendre l'envoi asynchrone de l'email
    log('3) Attente 5s (envoi email asynchrone)...');
    await new Promise((r) => setTimeout(r, 5000));

    // 4) Récupérer les logs emails et vérifier que GMAIL_EMAIL apparaît
    log('4) Récupération des logs emails...');
    const logsRes = await axios.get(`${API_URL}/api/v1/emails/logs`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      params: { limit: 100 },
      validateStatus: () => true,
      timeout: 10000,
    });

    if (logsRes.status !== 200) {
      log('   Échec GET /emails/logs: ' + logsRes.status);
      process.exitCode = 1;
      return;
    }

    const data = logsRes.data;
    if (!data.success || !Array.isArray(data.data)) {
      log('   Réponse invalide (success ou data manquant)');
      process.exitCode = 1;
      return;
    }

    const logs = data.data;
    const forOurEmail = logs.filter((entry) => {
      const to = (entry.to || '').toLowerCase();
      return to === GMAIL_EMAIL.toLowerCase() || to.includes('jt-inscription-') || to.includes('jobbingtrack.test');
    });

    if (logs.length === 0) {
      log('   Total logs: 0 — la table EmailLog est absente dans la base utilisée par auth-service.');
      log('   À faire (sortie complète, sans troncature):');
      log('     ./scripts/db/ensure-emaillog-table.sh');
      log('   Ou manuellement: make db-push-auth (Docker) ou cd backend/auth-service && npx prisma db push (local).');
      log('   Puis relancez: npm run test:inscription-gmail');
      process.exitCode = 1;
      return;
    }

    if (forOurEmail.length === 0) {
      log('   Aucun log pour ' + GMAIL_EMAIL + ' (inscription peut avoir échoué ou log asynchrone pas encore écrit).');
      log('   Total logs dans la table: ' + logs.length);
      process.exitCode = 1;
      return;
    }

    const verificationLogs = forOurEmail.filter((l) => (l.type || '').toUpperCase() === 'VERIFICATION');
    log('   Logs pour ce compte: ' + forOurEmail.length + ' (dont VERIFICATION: ' + verificationLogs.length + ')');
    if (verificationLogs.length > 0) {
      const last = verificationLogs[0];
      log('   Dernier: to=' + last.to + ' type=' + last.type + ' status=' + last.status);
    }

    log('=== OK : Inscription Gmail et email de vérification loggé à la bonne adresse ===');
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      log('Impossible de joindre l\'API à ' + API_URL);
      log('Démarrez la gateway et auth-service (ex: make up-full ou docker-compose up -d).');
    } else {
      log('Erreur: ' + err.message);
    }
    process.exitCode = 1;
  }
}

main();
