const axios = require('axios');
const logger = require('../utils/logger');

// URLs des services (utiliser les noms de service Docker)
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://jobbingtrack-auth-service:3001';
const APPLICATION_SERVICE_URL = process.env.APPLICATION_SERVICE_URL || 'http://jobbingtrack-application-service:3002';
const COMPANY_SERVICE_URL = process.env.COMPANY_SERVICE_URL || 'http://jobbingtrack-company-service:3003';
const CONTACT_SERVICE_URL = process.env.CONTACT_SERVICE_URL || 'http://jobbingtrack-contact-service:3004';
const INTERVIEW_SERVICE_URL = process.env.INTERVIEW_SERVICE_URL || 'http://jobbingtrack-interview-service:3005';
const CALL_SERVICE_URL = process.env.CALL_SERVICE_URL || 'http://jobbingtrack-call-service:3008';
const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://jobbingtrack-event-service:3009';
const FOLLOWUP_SERVICE_URL = process.env.FOLLOWUP_SERVICE_URL || 'http://jobbingtrack-followup-service:3010';

function countSince(rows, field, date) {
  if (!Array.isArray(rows)) return 0;
  return rows.filter((row) => row?.[field] && new Date(row[field]) >= date).length;
}

function getTotal(data, collectionKey) {
  const rows = Array.isArray(data?.[collectionKey]) ? data[collectionKey] : [];
  return data?.pagination?.total != null ? Number(data.pagination.total) : rows.length;
}

function unwrapStats(result, key = 'stats') {
  if (result.status !== 'fulfilled' || !result.value?.data) return null;
  return result.value.data[key] || result.value.data.data || result.value.data;
}

/**
 * Récupérer les statistiques agrégées de tous les services
 */
const getAggregatedStatistics = async (req, res) => {
  try {
    const token = req.headers.authorization;

    // Configuration axios avec timeout
    const axiosConfig = {
      headers: { Authorization: token },
      timeout: 5000 // 5 secondes timeout par service
    };

    const distributionLimit = 500;

    // Récupérer les statistiques de chaque service en parallèle.
    const [
      usersStats,
      activeSessionsStats,
      applicationsStats,
      companiesStats,
      contactsStats,
      interviewsStats,
      callsStats,
      followupsStats,
      eventsStats
    ] = await Promise.allSettled([
      axios.get(`${AUTH_SERVICE_URL}/api/v1/auth/users`, { ...axiosConfig, params: { limit: distributionLimit } }).catch(err => {
        logger.warn('Erreur récupération users:', err.message);
        return { status: 'rejected', reason: err };
      }),
      axios.get(`${AUTH_SERVICE_URL}/api/v1/auth/sessions/active`, axiosConfig).catch(err => {
        logger.warn('Erreur récupération sessions actives:', err.message);
        return { status: 'rejected', reason: err };
      }),
      axios.get(`${APPLICATION_SERVICE_URL}/api/v1/applications`, { ...axiosConfig, params: { limit: distributionLimit } }).catch(err => {
        logger.warn('Erreur récupération applications:', err.message);
        return { status: 'rejected', reason: err };
      }),
      axios.get(`${COMPANY_SERVICE_URL}/api/v1/companies`, { ...axiosConfig, params: { limit: distributionLimit } }).catch(err => {
        logger.warn('Erreur récupération companies:', err.message);
        return { status: 'rejected', reason: err };
      }),
      axios.get(`${CONTACT_SERVICE_URL}/api/v1/contacts`, { ...axiosConfig, params: { limit: distributionLimit } }).catch(err => {
        logger.warn('Erreur récupération contacts:', err.message);
        return { status: 'rejected', reason: err };
      }),
      axios.get(`${INTERVIEW_SERVICE_URL}/api/v1/interviews`, { ...axiosConfig, params: { limit: distributionLimit } }).catch(err => {
        logger.warn('Erreur récupération interviews:', err.message);
        return { status: 'rejected', reason: err };
      }),
      axios.get(`${CALL_SERVICE_URL}/api/v1/calls/stats/overview`, axiosConfig).catch(err => {
        logger.warn('Erreur récupération appels:', err.message);
        return { status: 'rejected', reason: err };
      }),
      axios.get(`${FOLLOWUP_SERVICE_URL}/api/v1/followups/stats`, axiosConfig).catch(err => {
        logger.warn('Erreur récupération relances:', err.message);
        return { status: 'rejected', reason: err };
      }),
      axios.get(`${EVENT_SERVICE_URL}/api/v1/events/stats`, axiosConfig).catch(err => {
        logger.warn('Erreur récupération événements:', err.message);
        return { status: 'rejected', reason: err };
      })
    ]);

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Traiter les utilisateurs
    let users = { total: 0, byRole: {}, activeUsers: 0, newThisMonth: 0, activeSource: 'estimated_total' };
    if (usersStats.status === 'fulfilled' && usersStats.value.data) {
      const d = usersStats.value.data;
      users.total = getTotal(d, 'users');
      const userData = d.users || [];
      users.byRole = userData.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      users.newThisMonth = userData.filter(u => new Date(u.createdAt) >= thisMonth).length;
      users.newThisWeek = countSince(userData, 'createdAt', thisWeek);
      users.activeUsers = users.total;
    }
    if (activeSessionsStats.status === 'fulfilled' && activeSessionsStats.value.data) {
      const d = activeSessionsStats.value.data;
      const sessionsTotal = d.total != null ? Number(d.total) : (Array.isArray(d.sessions) ? d.sessions.length : 0);
      if (Number.isFinite(sessionsTotal) && sessionsTotal >= 0) {
        users.activeUsers = sessionsTotal;
        users.activeSource = 'sessions_last_30m';
      }
    }

    // Traiter les candidatures
    let applications = { 
      total: 0,
      byStatus: {},
      byType: {},
      thisMonth: 0,
      thisWeek: 0
    };
    if (applicationsStats.status === 'fulfilled' && applicationsStats.value.data) {
      const d = applicationsStats.value.data;
      applications.total = getTotal(d, 'applications');
      const appData = d.applications || [];
      applications.byStatus = appData.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {});
      applications.byType = appData.reduce((acc, app) => {
        const type = app.jobType || 'FULL_TIME';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      applications.thisMonth = countSince(appData, 'createdAt', thisMonth);
      applications.thisWeek = countSince(appData, 'createdAt', thisWeek);
    }

    // Traiter les entreprises
    let companies = { total: 0, byIndustry: {}, bySize: {}, thisMonth: 0, thisWeek: 0 };
    if (companiesStats.status === 'fulfilled' && companiesStats.value.data) {
      const d = companiesStats.value.data;
      companies.total = getTotal(d, 'companies');
      const companyData = d.companies || [];
      companies.byIndustry = companyData.reduce((acc, company) => {
        const industry = company.industry || 'Non spécifié';
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
      }, {});
      companies.bySize = companyData.reduce((acc, company) => {
        const size = company.size || 'Non spécifié';
        acc[size] = (acc[size] || 0) + 1;
        return acc;
      }, {});
      companies.thisMonth = countSince(companyData, 'createdAt', thisMonth);
      companies.thisWeek = countSince(companyData, 'createdAt', thisWeek);
    }

    // Traiter les contacts
    let contacts = { total: 0, thisMonth: 0, thisWeek: 0 };
    if (contactsStats.status === 'fulfilled' && contactsStats.value.data) {
      const d = contactsStats.value.data;
      contacts.total = getTotal(d, 'contacts');
      const contactData = d.contacts || [];
      contacts.thisMonth = countSince(contactData, 'createdAt', thisMonth);
      contacts.thisWeek = countSince(contactData, 'createdAt', thisWeek);
    }

    // Traiter les entretiens
    let interviews = { 
      total: 0, 
      byStatus: {}, 
      upcoming: 0, 
      completed: 0 
    };
    if (interviewsStats.status === 'fulfilled' && interviewsStats.value.data) {
      const d = interviewsStats.value.data;
      interviews.total = d.pagination?.total != null ? Number(d.pagination.total) : (Array.isArray(d.interviews) ? d.interviews.length : 0);
      const interviewData = d.interviews || [];
      interviews.byStatus = interviewData.reduce((acc, interview) => {
        acc[interview.status] = (acc[interview.status] || 0) + 1;
        return acc;
      }, {});
      interviews.upcoming = interviewData.filter(i => 
        new Date(i.scheduledAt) > now && i.status === 'SCHEDULED'
      ).length;
      interviews.completed = interviewData.filter(i => 
        i.status === 'COMPLETED'
      ).length;
      interviews.thisWeek = countSince(interviewData, 'createdAt', thisWeek);
    }

    const calls = unwrapStats(callsStats) || { total: 0, upcoming: 0, completed: 0, byStatus: {} };
    const followups = unwrapStats(followupsStats) || { total: 0, upcoming: 0, overdue: 0, byStatus: {} };
    const events = unwrapStats(eventsStats) || { total: 0, upcoming: 0, createdThisWeek: 0 };

    // Statistiques de performance (à améliorer avec de vraies métriques)
    const performance = {
      averageResponseTime: 150, // ms
      successRate: 98.5, // %
      errorRate: 0.5 // %
    };

    // Retourner les statistiques agrégées avec format compatible frontend
    const response = {
      success: true,
      statistics: {
        users: {
          total: users.total,
          by_role: users.byRole,
          active: users.activeUsers,
          active_source: users.activeSource,
          new_this_month: users.newThisMonth,
          new_this_week: users.newThisWeek || 0
        },
        applications: {
          total: applications.total,
          by_status: applications.byStatus,
          by_type: applications.byType,
          this_month: applications.thisMonth,
          this_week: applications.thisWeek
        },
        companies: {
          total: companies.total,
          by_industry: companies.byIndustry,
          by_size: companies.bySize,
          this_month: companies.thisMonth,
          this_week: companies.thisWeek
        },
        contacts: {
          total: contacts.total,
          this_month: contacts.thisMonth,
          this_week: contacts.thisWeek
        },
        interviews: {
          total: interviews.total,
          by_status: interviews.byStatus,
          upcoming: interviews.upcoming,
          completed: interviews.completed,
          this_week: interviews.thisWeek || 0
        },
        calls: {
          total: Number(calls.total || 0),
          this_week: Number(calls.createdThisWeek || calls.this_week || 0),
          upcoming: Number(calls.upcoming || 0),
          completed: Number(calls.completed || 0),
          by_status: calls.byStatus || calls.by_status || {}
        },
        followups: {
          total: Number(followups.total || 0),
          pending: Number(followups.upcoming || followups.pending || 0),
          overdue: Number(followups.overdue || 0),
          by_status: followups.byStatus || followups.by_status || {}
        },
        events: {
          total: Number(events.total || 0),
          this_month: Number(events.createdThisMonth || 0),
          this_week: Number(events.createdThisWeek || events.this_week || 0),
          upcoming: Number(events.upcoming || 0)
        },
        summary: {
          total_users: users.total,
          total_applications: applications.total,
          total_companies: companies.total,
          total_contacts: contacts.total,
          total_interviews: interviews.total,
          total_calls: Number(calls.total || 0),
          total_followups: Number(followups.total || 0),
          total_events: Number(events.total || 0),
          active_users: users.activeUsers,
          new_this_week: users.newThisWeek || applications.thisWeek,
          new_this_month: users.newThisMonth || applications.thisMonth
        }
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    logger.error('Erreur récupération statistiques agrégées:', error);
    
    // Retourner des statistiques vides plutôt qu'une erreur pour éviter les crashes
    res.json({
      success: true,
      statistics: {
        users: { total: 0, by_role: {}, active: 0, new_this_month: 0, new_this_week: 0 },
        applications: { total: 0, by_status: {}, by_type: {}, this_month: 0, this_week: 0 },
        companies: { total: 0, by_industry: {}, by_size: {}, this_month: 0, this_week: 0 },
        contacts: { total: 0, this_month: 0, this_week: 0 },
        interviews: { total: 0, by_status: {}, upcoming: 0, completed: 0, this_week: 0 },
        calls: { total: 0, this_week: 0, upcoming: 0, completed: 0, by_status: {} },
        followups: { total: 0, pending: 0, overdue: 0, by_status: {} },
        events: { total: 0, this_month: 0, this_week: 0, upcoming: 0 },
        summary: {
          total_users: 0,
          total_applications: 0,
          total_companies: 0,
          total_contacts: 0,
          total_interviews: 0,
          total_calls: 0,
          total_followups: 0,
          total_events: 0,
          active_users: 0,
          new_this_week: 0,
          new_this_month: 0
        }
      },
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer une timeline simplifiée (fallback) des statistiques.
 * Note: ce service ne persiste pas encore d'historique fin, on retourne
 * une série minimale cohérente avec l'état courant pour éviter les 404 front.
 */
const getStatisticsTimeline = async (req, res) => {
  try {
    const { time_range = '24h', limit = 500 } = req.query;
    const now = new Date();
    const current = await new Promise((resolve) => {
      const fakeRes = {
        json: (data) => resolve(data),
      };
      getAggregatedStatistics(req, fakeRes);
    });
    const stats = current?.statistics || {};
    const point = {
      timestamp: now.toISOString(),
      total_users: Number(stats?.users?.total || 0),
      active_users: Number(stats?.users?.active || 0),
      total_applications: Number(stats?.applications?.total || 0),
      total_companies: Number(stats?.companies?.total || 0),
      total_contacts: Number(stats?.contacts?.total || 0),
      total_interviews: Number(stats?.interviews?.total || 0),
      total_calls: Number(stats?.calls?.total || 0),
      total_followups: Number(stats?.followups?.total || 0),
      total_events: Number(stats?.events?.total || 0),
      new_this_week: Number(stats?.summary?.new_this_week || 0),
      new_this_month: Number(stats?.summary?.new_this_month || 0),
      applications_by_status: stats?.applications?.by_status || {},
      users_by_role: stats?.users?.by_role || {},
      companies_by_industry: stats?.companies?.by_industry || {},
      calls_by_status: stats?.calls?.by_status || {},
      followups_by_status: stats?.followups?.by_status || {},
    };
    return res.json({
      success: true,
      time_range,
      limit: Number(limit) || 500,
      timeline: [point],
      note: 'Timeline simplifiée (fallback) en attendant la persistance historique dédiée.',
    });
  } catch (error) {
    logger.error('Erreur récupération timeline statistiques:', error);
    return res.json({ success: true, timeline: [] });
  }
};

const getStatisticsSummary = async (req, res) => {
  try {
    const current = await new Promise((resolve) => {
      const fakeRes = {
        json: (data) => resolve(data),
      };
      getAggregatedStatistics(req, fakeRes);
    });
    return res.json({
      success: true,
      summary: current?.statistics?.summary || {
        total_users: 0,
        total_applications: 0,
        total_companies: 0,
        total_contacts: 0,
        total_interviews: 0,
        active_users: 0,
        new_this_week: 0,
        new_this_month: 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Erreur récupération résumé statistiques:', error);
    return res.json({ success: true, summary: null });
  }
};

const collectStatistics = async (req, res) => {
  return res.json({
    success: true,
    message: 'Collecte pilotée par les services sources; endpoint de compatibilité actif.',
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  getAggregatedStatistics,
  getStatisticsTimeline,
  getStatisticsSummary,
  collectStatistics,
};

