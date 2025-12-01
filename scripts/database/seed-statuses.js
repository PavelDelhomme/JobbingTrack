#!/usr/bin/env node

/**
 * Script de Seed - Statuts Système par Défaut
 * 
 * Ce script crée les statuts système par défaut dans la base de données.
 * 
 * Usage:
 *   node scripts/database/seed-statuses.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedStatuses() {
  console.log('🌱 Seed des statuts système par défaut...\n');

  try {
// Seed ApplicationStatus - Statuts système par défaut
  await prisma.applicationstatus.createMany({
    data: [
    {
      code: 'CANDIDATE_PENDING',
      name: 'Candidaté',
      description: 'Candidaté et en attente',
      order: 1,
      color: '#3B82F6',
      icon: 'Clock',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'NO_RESPONSE',
      name: 'Aucune réponse',
      description: 'Aucune réponse reçue',
      order: 2,
      color: '#F59E0B',
      icon: 'AlertCircle',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'NO_RESPONSE_AFTER_FIRST_FOLLOWUP',
      name: 'Pas de réponse (1 relance)',
      description: 'Aucune réponse après 1 relance',
      order: 3,
      color: '#EF4444',
      icon: 'AlertTriangle',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'NO_RESPONSE_AFTER_SECOND_FOLLOWUP',
      name: 'Pas de réponse (2 relances)',
      description: 'Aucune réponse après 2 relances',
      order: 4,
      color: '#DC2626',
      icon: 'XCircle',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'FIRST_INTERVIEW_PENDING',
      name: '1er entretien en attente',
      description: 'Premier entretien programmé',
      order: 5,
      color: '#8B5CF6',
      icon: 'Calendar',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'OTHER_INTERVIEW_PENDING',
      name: 'Autre entretien en attente',
      description: 'Autre entretien programmé',
      order: 6,
      color: '#7C3AED',
      icon: 'Calendar',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'TECHNICAL_TEST_PENDING',
      name: 'Test technique en cours',
      description: 'Test technique en cours',
      order: 7,
      color: '#6366F1',
      icon: 'FileText',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'OFFER_RECEIVED',
      name: 'Offre reçue',
      description: 'Offre d\'emploi reçue',
      order: 8,
      color: '#10B981',
      icon: 'CheckCircle',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'ACCEPTED_AFTER_INTERVIEW',
      name: 'Retenue',
      description: 'Retenue après entretien',
      order: 9,
      color: '#059669',
      icon: 'CheckCircle2',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'REJECTED_WITHOUT_INTERVIEW',
      name: 'Non retenue (sans entretien)',
      description: 'Non retenue sans entretien',
      order: 10,
      color: '#EF4444',
      icon: 'X',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'REJECTED_AFTER_INTERVIEW',
      name: 'Non retenue (après entretien)',
      description: 'Non retenue après entretien',
      order: 11,
      color: '#DC2626',
      icon: 'XCircle',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'WITHDRAWN',
      name: 'Candidature retirée',
      description: 'Candidature retirée par le candidat',
      order: 12,
      color: '#6B7280',
      icon: 'Archive',
      userId: null,
      isPredefined: true,
      isActive: true,
    }
    ],
    skipDuplicates: true,
  });

    console.log('✅ ApplicationStatus créés');

// Seed InterviewStatus - Statuts système par défaut
  await prisma.interviewstatus.createMany({
    data: [
    {
      code: 'SCHEDULED',
      name: 'Programmé',
      description: 'Entretien programmé',
      order: 1,
      color: '#3B82F6',
      icon: 'Calendar',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'COMPLETED',
      name: 'Terminé',
      description: 'Entretien passé',
      order: 2,
      color: '#10B981',
      icon: 'CheckCircle',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'FEEDBACK_PENDING',
      name: 'En attente de retour',
      description: 'En attente de retour',
      order: 3,
      color: '#F59E0B',
      icon: 'Clock',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'CANCELLED',
      name: 'Annulé',
      description: 'Entretien annulé',
      order: 4,
      color: '#EF4444',
      icon: 'XCircle',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'RESCHEDULED',
      name: 'Reporté',
      description: 'Entretien reporté',
      order: 5,
      color: '#8B5CF6',
      icon: 'CalendarClock',
      userId: null,
      isPredefined: true,
      isActive: true,
    }
    ],
    skipDuplicates: true,
  });

    console.log('✅ InterviewStatus créés');

// Seed FollowUpStatus - Statuts système par défaut
  await prisma.followupstatus.createMany({
    data: [
    {
      code: 'PENDING',
      name: 'En attente',
      description: 'Relance en attente',
      order: 1,
      color: '#3B82F6',
      icon: 'Clock',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'POSITIVE_RESPONSE',
      name: 'Réponse positive',
      description: 'Retour positif reçu',
      order: 2,
      color: '#10B981',
      icon: 'CheckCircle',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'NEGATIVE_RESPONSE',
      name: 'Réponse négative',
      description: 'Retour négatif reçu',
      order: 3,
      color: '#EF4444',
      icon: 'XCircle',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'NO_RESPONSE',
      name: 'Aucun retour',
      description: 'Aucun retour reçu',
      order: 4,
      color: '#F59E0B',
      icon: 'AlertCircle',
      userId: null,
      isPredefined: true,
      isActive: true,
    },
    {
      code: 'PLANNED',
      name: 'Prévue',
      description: 'Relance prévisionnelle',
      order: 5,
      color: '#8B5CF6',
      icon: 'Calendar',
      userId: null,
      isPredefined: true,
      isActive: true,
    }
    ],
    skipDuplicates: true,
  });

    console.log('✅ FollowUpStatus créés');

    console.log('\n✅ Seed terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors du seed :', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedStatuses();
}

module.exports = { seedStatuses };
