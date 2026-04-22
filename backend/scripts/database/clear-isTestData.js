#!/usr/bin/env node
/**
 * Supprime les enregistrements marqués isTestData=true (même logique que POST /api/v1/admin/clear-test-data).
 * Ne supprime jamais les comptes dont l’email est dans ADMIN_EMAIL ou PROTECTED_USER_EMAILS (ex. admin réel).
 *
 * Usage :
 *   cd backend && node scripts/database/clear-isTestData.js
 *   cd backend && node scripts/database/clear-isTestData.js --dry-run
 *
 * Variables : DATABASE_URL, ADMIN_EMAIL, PROTECTED_USER_EMAILS (emails séparés par des virgules, optionnel)
 */

const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '../../..');
const backendDir = path.resolve(__dirname, '../..');
const envRoot = path.join(rootDir, '.env');
const envBackend = path.join(backendDir, '.env');

if (fs.existsSync(envRoot)) {
  require('dotenv').config({ path: envRoot });
}
if (fs.existsSync(envBackend)) {
  require('dotenv').config({ path: envBackend });
}

const { PrismaClient } = require('@prisma/client');

const dryRun = process.argv.includes('--dry-run');

function protectedEmailList() {
  const admin = (process.env.ADMIN_EMAIL || 'admin@jobbingtrack.com').trim();
  const extra = (process.env.PROTECTED_USER_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  return [...new Set([admin, ...extra])];
}

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL ||
          'postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack?schema=public'
      }
    }
  });

  const protectedEmails = protectedEmailList();
  console.log('🧹 Nettoyage des données isTestData=true');
  console.log(`   Emails protégés (jamais supprimés) : ${protectedEmails.join(', ')}`);
  if (dryRun) {
    console.log('   Mode --dry-run : aucune suppression, comptages seulement.\n');
  }

  const counts = {
    documents: 0,
    events: 0,
    calls: 0,
    followUps: 0,
    interviews: 0,
    applications: 0,
    contacts: 0,
    companies: 0,
    users: 0
  };

  const run = async (label, fn) => {
    if (dryRun) {
      const n = await fn(true);
      console.log(`   [dry-run] ${label}: ${n}`);
      return n;
    }
    const n = await fn(false);
    console.log(`   ✅ ${label}: ${n}`);
    return n;
  };

  try {
    counts.documents = await run('documents (isTestData)', async (countOnly) => {
      if (countOnly) return prisma.document.count({ where: { isTestData: true } });
      return prisma.document.deleteMany({ where: { isTestData: true } }).then((r) => r.count);
    });

    counts.events = await run('events', async (countOnly) => {
      if (countOnly) return prisma.event.count({ where: { isTestData: true } });
      return prisma.event.deleteMany({ where: { isTestData: true } }).then((r) => r.count);
    });

    counts.calls = await run('calls', async (countOnly) => {
      if (countOnly) return prisma.call.count({ where: { isTestData: true } });
      return prisma.call.deleteMany({ where: { isTestData: true } }).then((r) => r.count);
    });

    counts.followUps = await run('followUps', async (countOnly) => {
      if (countOnly) return prisma.followUp.count({ where: { isTestData: true } });
      return prisma.followUp.deleteMany({ where: { isTestData: true } }).then((r) => r.count);
    });

    counts.interviews = await run('interviews', async (countOnly) => {
      if (countOnly) return prisma.interview.count({ where: { isTestData: true } });
      return prisma.interview.deleteMany({ where: { isTestData: true } }).then((r) => r.count);
    });

    counts.applications = await run('applications', async (countOnly) => {
      if (countOnly) return prisma.application.count({ where: { isTestData: true } });
      return prisma.application.deleteMany({ where: { isTestData: true } }).then((r) => r.count);
    });

    counts.contacts = await run('contacts', async (countOnly) => {
      if (countOnly) return prisma.contact.count({ where: { isTestData: true } });
      return prisma.contact.deleteMany({ where: { isTestData: true } }).then((r) => r.count);
    });

    counts.companies = await run('companies', async (countOnly) => {
      if (countOnly) return prisma.company.count({ where: { isTestData: true } });
      return prisma.company.deleteMany({ where: { isTestData: true } }).then((r) => r.count);
    });

    const notEmails = [...protectedEmails];
    counts.users = await run('users (isTestData, hors emails protégés)', async (countOnly) => {
      const where = {
        isTestData: true,
        email: { notIn: notEmails }
      };
      if (countOnly) return prisma.user.count({ where });
      return prisma.user.deleteMany({ where }).then((r) => r.count);
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log('');
    console.log(dryRun ? `📊 Total concerné (dry-run) : ${total}` : `🎉 Total supprimé : ${total}`);
  } catch (e) {
    console.error('❌ Erreur:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
