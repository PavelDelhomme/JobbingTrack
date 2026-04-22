const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const execPromise = util.promisify(exec);
const logger = require('../utils/logger');
const path = require('path');

/**
 * Génère des données de test cohérentes
 */
const generateTestData = async (req, res) => {
  try {
    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Seuls les administrateurs peuvent générer des données de test.'
      });
    }

    const config = req.body || {};
    
    logger.info(`🎲 Admin ${req.user.email} génère des données de test avec config:`, config);

    // Configuration par défaut
    const preset = config.preset || 'standard';
    const configOptions = {
      minimal: { users: 2, companies: 5, applications: 5, contacts: 5, interviews: 2, followups: 3, calls: 2, events: 5, deletedItems: 1, archivedItems: 1 },
      standard: { users: 3, companies: 10, applications: 20, contacts: 15, interviews: 8, followups: 12, calls: 10, events: 20, deletedItems: 5, archivedItems: 3 },
      mobile: { users: 3, companies: 10, applications: 20, contacts: 12, interviews: 5, followups: 8, calls: 5, events: 10, deletedItems: 2, archivedItems: 2 },
      complete: { users: 5, companies: 20, applications: 50, contacts: 40, interviews: 20, followups: 30, calls: 25, events: 50, deletedItems: 10, archivedItems: 8 },
      demo: { users: 1, companies: 8, applications: 15, contacts: 12, interviews: 6, followups: 8, calls: 5, events: 15, deletedItems: 2, archivedItems: 2 }
    };

    let finalConfig = config.custom || configOptions[preset] || configOptions.standard;
    if (config.balanced && typeof finalConfig === 'object' && finalConfig !== null) {
      finalConfig = { ...finalConfig, _balanced: true };
    }
    const configJson = JSON.stringify(finalConfig).replace(/"/g, '\\"');

    // Chemin du script : env, puis /app en Docker, puis relatif (local)
    let scriptPath = process.env.GENERATE_TEST_DATA_SCRIPT;
    if (!scriptPath) {
      const inApp = '/app/generate-test-data.js';
      const relative = path.resolve(__dirname, '../../..', 'generate-test-data.js');
      scriptPath = fs.existsSync(inApp) ? inApp : relative;
    }
    if (!fs.existsSync(scriptPath)) {
      logger.error('Script generate-test-data.js introuvable. Tente: /app/generate-test-data.js et ' + path.resolve(__dirname, '../../..', 'generate-test-data.js'));
      return res.status(500).json({
        success: false,
        error: `Script introuvable (cherche: /app/generate-test-data.js). Rebuild l'image api-gateway (make rebuild-service SERVICE=api-gateway).`
      });
    }
    const command = `node "${scriptPath}" '${configJson}'`;
    logger.info('📝 Exécution du script:', command);
    // Pour que l’admin qui lance la génération voie les données (Suivi intérim, etc.)
    const env = {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack?schema=public',
      TEST_DATA_OWNER_ID: req.user?.id || '',
      TEST_DATA_OWNER_EMAIL: req.user?.email || '',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@jobbingtrack.test',
      GENERATE_TEST_DATA_BALANCED: config.balanced ? '1' : ''
    };
    const { stdout, stderr } = await execPromise(command, {
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      env
    });

    if (stderr && !stderr.includes('Warning')) {
      logger.error('Erreur génération données test:', stderr);
    }

    logger.info('✅ Données de test générées avec succès');
    logger.info(stdout);

    res.json({
      success: true,
      message: 'Données de test générées avec succès',
      output: stdout,
      config,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erreur génération données test:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Nettoie toutes les données de test ou par tag
 * Utilise maintenant le champ isTestData pour distinguer les données
 */
const clearTestData = async (req, res) => {
  try {
    // Vérifier les permissions SUPER_ADMIN uniquement
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Seuls les ADMIN peuvent nettoyer les données de test.'
      });
    }

    const { tag, onlyTestData = true } = req.body || {};

    logger.warn(`🗑️ ${req.user.role} ${req.user.email} nettoie les données de test${tag ? ` avec tag: ${tag}` : ''}`);

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    let deletedCounts = {
      documents: 0,
      emailLogs: 0,
      users: 0,
      companies: 0,
      applications: 0,
      contacts: 0,
      interviews: 0,
      followUps: 0,
      calls: 0,
      events: 0
    };

    try {
      // Supprimer uniquement les données marquées comme test (isTestData = true)
      if (onlyTestData) {
        const testUserIds = (
          await prisma.user.findMany({
            where: { isTestData: true },
            select: { id: true }
          })
        ).map((u) => u.id);

        deletedCounts.documents = await prisma.document.deleteMany({
          where: { isTestData: true }
        }).then((r) => r.count);

        // Logs mails liés aux comptes de test ou envois de type TEST
        try {
          deletedCounts.emailLogs = await prisma.emailLog.deleteMany({
            where: {
              OR: [{ type: 'TEST' }, ...(testUserIds.length ? [{ userId: { in: testUserIds } }] : [])]
            }
          }).then((r) => r.count);
        } catch (e) {
          logger.warn('EmailLog cleanup skip (modèle ou client):', e.message);
        }

        // Supprimer dans l'ordre inverse des dépendances
        deletedCounts.events = await prisma.event.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.calls = await prisma.call.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.followUps = await prisma.followUp.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.interviews = await prisma.interview.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.applications = await prisma.application.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.contacts = await prisma.contact.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.companies = await prisma.company.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        // Supprimer uniquement les utilisateurs marqués isTestData (ne pas toucher admin ni PROTECTED_USER_EMAILS)
        const adminEmail = (process.env.ADMIN_EMAIL || 'admin@jobbingtrack.test').trim();
        const protectedEmails = [
          adminEmail,
          ...(process.env.PROTECTED_USER_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
        ];
        deletedCounts.users = await prisma.user.deleteMany({
          where: {
            isTestData: true,
            email: { notIn: protectedEmails }
          }
        }).then(r => r.count);

        logger.info(`✅ Données de test nettoyées:`, deletedCounts);
      } else if (tag) {
        // Nettoyer par tag (ancienne méthode de fallback)
        const tagPattern = `[TEST_DATA_TAG:${tag}]`;
        
        deletedCounts.applications = await prisma.application.deleteMany({
          where: {
            notes: { contains: tagPattern },
            isTestData: true
          }
        }).then(r => r.count);
        
        deletedCounts.companies = await prisma.company.deleteMany({
          where: {
            description: { contains: tagPattern },
            isTestData: true
          }
        }).then(r => r.count);
        
        deletedCounts.contacts = await prisma.contact.deleteMany({
          where: {
            notes: { contains: tagPattern },
            isTestData: true
          }
        }).then(r => r.count);
        
        deletedCounts.interviews = await prisma.interview.deleteMany({
          where: {
            notes: { contains: tagPattern },
            isTestData: true
          }
        }).then(r => r.count);
        
        deletedCounts.followUps = await prisma.followUp.deleteMany({
          where: {
            notes: { contains: tagPattern },
            isTestData: true
          }
        }).then(r => r.count);
        
        deletedCounts.calls = await prisma.call.deleteMany({
          where: {
            notes: { contains: tagPattern },
            isTestData: true
          }
        }).then(r => r.count);
        
        deletedCounts.events = await prisma.event.deleteMany({
          where: {
            description: { contains: tagPattern },
            isTestData: true
          }
        }).then(r => r.count);
      } else {
        // Nettoyer toutes les données de test (sans tag spécifique) — même logique que onlyTestData=true côté entités
        const testUserIdsElse = (
          await prisma.user.findMany({
            where: { isTestData: true },
            select: { id: true }
          })
        ).map((u) => u.id);

        deletedCounts.documents = await prisma.document.deleteMany({
          where: { isTestData: true }
        }).then((r) => r.count);

        try {
          const orEmailElse = [{ type: 'TEST' }];
          if (testUserIdsElse.length) orEmailElse.push({ userId: { in: testUserIdsElse } });
          deletedCounts.emailLogs = await prisma.emailLog.deleteMany({
            where: { OR: orEmailElse }
          }).then((r) => r.count);
        } catch (e) {
          logger.warn('EmailLog cleanup skip (else branch):', e.message);
        }

        deletedCounts.events = await prisma.event.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.calls = await prisma.call.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.followUps = await prisma.followUp.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.interviews = await prisma.interview.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.applications = await prisma.application.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.contacts = await prisma.contact.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        deletedCounts.companies = await prisma.company.deleteMany({
          where: { isTestData: true }
        }).then(r => r.count);

        const adminEmail = (process.env.ADMIN_EMAIL || 'admin@jobbingtrack.test').trim();
        const protectedEmails = [
          adminEmail,
          ...(process.env.PROTECTED_USER_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
        ];
        deletedCounts.users = await prisma.user.deleteMany({
          where: {
            isTestData: true,
            email: { notIn: protectedEmails }
          }
        }).then(r => r.count);
      }
      
      await prisma.$disconnect();
      
      const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);
      
      logger.info(`✅ ${totalDeleted} données de test nettoyées`);
      
      res.json({
        success: true,
        message: `${totalDeleted} données de test supprimées`,
        deletedCounts,
        tag: tag || null,
        timestamp: new Date().toISOString()
      });
    } catch (prismaError) {
      await prisma.$disconnect();
      throw prismaError;
    }

  } catch (error) {
    logger.error('Erreur nettoyage données:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Statut des données de test
 */
const getTestDataStatus = async (req, res) => {
  try {
    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    // Compter les éléments dans la base
    const { stdout } = await execPromise(
      'cd /app/.. && docker compose exec -T postgres psql -U jobbingtrack -d jobbingtrack -c "SELECT \'applications\' as table, COUNT(*) as count FROM \\"Application\\" UNION SELECT \'companies\', COUNT(*) FROM \\"Company\\" UNION SELECT \'contacts\', COUNT(*) FROM \\"Contact\\" UNION SELECT \'interviews\', COUNT(*) FROM \\"Interview\\" UNION SELECT \'followups\', COUNT(*) FROM \\"FollowUp\\" UNION SELECT \'calls\', COUNT(*) FROM \\"Call\\";"'
    );

    res.json({
      success: true,
      status: stdout,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erreur récupération statut:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Compteurs isTestData + emails de test (pour backoffice Données test)
 */
const getTestDataSummary = async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@jobbingtrack.test').trim().toLowerCase();

    try {
      const testUserIds = (
        await prisma.user.findMany({ where: { isTestData: true }, select: { id: true } })
      ).map((u) => u.id);

      const [
        usersTest,
        usersNonAdminProd,
        companies,
        applications,
        contacts,
        interviews,
        followUps,
        calls,
        events,
        documents
      ] = await Promise.all([
        prisma.user.count({ where: { isTestData: true } }),
        prisma.user.count({
          where: {
            isTestData: false,
            email: { not: adminEmail }
          }
        }),
        prisma.company.count({ where: { isTestData: true } }),
        prisma.application.count({ where: { isTestData: true } }),
        prisma.contact.count({ where: { isTestData: true } }),
        prisma.interview.count({ where: { isTestData: true } }),
        prisma.followUp.count({ where: { isTestData: true } }),
        prisma.call.count({ where: { isTestData: true } }),
        prisma.event.count({ where: { isTestData: true } }),
        prisma.document.count({ where: { isTestData: true } })
      ]);

      let emailLogsTest = 0;
      try {
        const orEmail = [{ type: 'TEST' }];
        if (testUserIds.length) orEmail.push({ userId: { in: testUserIds } });
        emailLogsTest = await prisma.emailLog.count({ where: { OR: orEmail } });
      } catch (e) {
        logger.warn('getTestDataSummary emailLog:', e.message);
      }

      await prisma.$disconnect();

      res.json({
        success: true,
        protectedAdminEmail: adminEmail,
        protectedUserEmails: (process.env.PROTECTED_USER_EMAILS || '')
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean),
        counts: {
          usersTest,
          usersNonAdminNotTagged: usersNonAdminProd,
          companies,
          applications,
          contacts,
          interviews,
          followUps,
          calls,
          events,
          documents,
          emailLogsTest
        },
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      await prisma.$disconnect();
      throw e;
    }
  } catch (error) {
    logger.error('Erreur getTestDataSummary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Marque isTestData sur les comptes « évidents » de test (hors admin + PROTECTED_USER_EMAILS)
 * puis propage sur entreprises / candidatures / contacts / entretiens / relances / appels / événements possédés.
 * Optionnel : entités dont les notes contiennent [TEST_DATA_TAG:
 */
const tagLikelyTestData = async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Seuls les administrateurs peuvent marquer les données de test.'
      });
    }

    const { includeTaggedNotes = true } = req.body || {};
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@jobbingtrack.test').trim().toLowerCase();
    const protectedSet = new Set(
      [
        adminEmail,
        ...(process.env.PROTECTED_USER_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
      ]
    );
    const testUserEmailEnv = (process.env.TEST_USER_EMAIL || '').trim().toLowerCase();

    const tagged = {
      users: 0,
      companies: 0,
      applications: 0,
      contacts: 0,
      interviews: 0,
      followUps: 0,
      calls: 0,
      events: 0
    };

    try {
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, isTestData: true }
      });

      const userIdsToTag = new Set();
      for (const u of allUsers) {
        const em = (u.email || '').trim().toLowerCase();
        if (protectedSet.has(em)) continue;
        if (u.isTestData) continue;
        if (testUserEmailEnv && em === testUserEmailEnv) {
          userIdsToTag.add(u.id);
          continue;
        }
        if (em.endsWith('@jobbingtrack.test')) {
          userIdsToTag.add(u.id);
          continue;
        }
        if (/^user\d+@jobbingtrack\.com$/i.test(em)) {
          userIdsToTag.add(u.id);
          continue;
        }
        if (/@test\./i.test(em) || em.endsWith('.test')) {
          userIdsToTag.add(u.id);
          continue;
        }
      }

      const newIds = [...userIdsToTag];
      if (newIds.length) {
        const r = await prisma.user.updateMany({
          where: { id: { in: newIds }, isTestData: false },
          data: { isTestData: true }
        });
        tagged.users = r.count;
      }

      const testUserIds = (await prisma.user.findMany({ where: { isTestData: true }, select: { id: true } })).map(
        (x) => x.id
      );

      if (testUserIds.length) {
        tagged.companies += (
          await prisma.company.updateMany({
            where: { userId: { in: testUserIds }, isTestData: false },
            data: { isTestData: true }
          })
        ).count;
        tagged.applications += (
          await prisma.application.updateMany({
            where: { userId: { in: testUserIds }, isTestData: false },
            data: { isTestData: true }
          })
        ).count;
        tagged.contacts += (
          await prisma.contact.updateMany({
            where: { userId: { in: testUserIds }, isTestData: false },
            data: { isTestData: true }
          })
        ).count;
        tagged.interviews += (
          await prisma.interview.updateMany({
            where: { userId: { in: testUserIds }, isTestData: false },
            data: { isTestData: true }
          })
        ).count;
        tagged.followUps += (
          await prisma.followUp.updateMany({
            where: { userId: { in: testUserIds }, isTestData: false },
            data: { isTestData: true }
          })
        ).count;
        tagged.calls += (
          await prisma.call.updateMany({
            where: { userId: { in: testUserIds }, isTestData: false },
            data: { isTestData: true }
          })
        ).count;
        tagged.events += (
          await prisma.event.updateMany({
            where: { userId: { in: testUserIds }, isTestData: false },
            data: { isTestData: true }
          })
        ).count;
      }

      if (includeTaggedNotes) {
        const tagFragment = '[TEST_DATA_TAG:';
        tagged.applications += (
          await prisma.application.updateMany({
            where: { isTestData: false, notes: { contains: tagFragment } },
            data: { isTestData: true }
          })
        ).count;
        tagged.companies += (
          await prisma.company.updateMany({
            where: { isTestData: false, description: { contains: tagFragment } },
            data: { isTestData: true }
          })
        ).count;
        tagged.contacts += (
          await prisma.contact.updateMany({
            where: { isTestData: false, notes: { contains: tagFragment } },
            data: { isTestData: true }
          })
        ).count;
        tagged.interviews += (
          await prisma.interview.updateMany({
            where: { isTestData: false, notes: { contains: tagFragment } },
            data: { isTestData: true }
          })
        ).count;
        tagged.followUps += (
          await prisma.followUp.updateMany({
            where: { isTestData: false, notes: { contains: tagFragment } },
            data: { isTestData: true }
          })
        ).count;
        tagged.calls += (
          await prisma.call.updateMany({
            where: { isTestData: false, notes: { contains: tagFragment } },
            data: { isTestData: true }
          })
        ).count;
        tagged.events += (
          await prisma.event.updateMany({
            where: { isTestData: false, description: { contains: tagFragment } },
            data: { isTestData: true }
          })
        ).count;
      }

      await prisma.$disconnect();

      logger.info(`🏷️ tagLikelyTestData par ${req.user.email}:`, tagged);
      res.json({
        success: true,
        message:
          'Comptes et entités associées marqués isTestData (heuristiques + notes [TEST_DATA_TAG:…]). Admin et PROTECTED_USER_EMAILS exclus.',
        tagged,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      await prisma.$disconnect();
      throw e;
    }
  } catch (error) {
    logger.error('Erreur tagLikelyTestData:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  generateTestData,
  clearTestData,
  getTestDataStatus,
  getTestDataSummary,
  tagLikelyTestData
};

