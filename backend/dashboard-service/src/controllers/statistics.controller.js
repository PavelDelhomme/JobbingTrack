const axios = require('axios');
const logger = require('../utils/logger');

// URLs des services
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const APPLICATION_SERVICE_URL = process.env.APPLICATION_SERVICE_URL || 'http://localhost:3002';
const COMPANY_SERVICE_URL = process.env.COMPANY_SERVICE_URL || 'http://localhost:3003';
const CONTACT_SERVICE_URL = process.env.CONTACT_SERVICE_URL || 'http://localhost:3004';
const INTERVIEW_SERVICE_URL = process.env.INTERVIEW_SERVICE_URL || 'http://localhost:3005';

/**
 * Récupérer les statistiques agrégées de tous les services
 */
const getAggregatedStatistics = async (req, res) => {
  try {
    const token = req.headers.authorization;

    // Récupérer les statistiques de chaque service en parallèle
    const [
      usersStats,
      applicationsStats,
      companiesStats,
      contactsStats,
      interviewsStats
    ] = await Promise.allSettled([
      axios.get(`${AUTH_SERVICE_URL}/api/v1/auth/users`, { headers: { Authorization: token } }),
      axios.get(`${APPLICATION_SERVICE_URL}/api/v1/applications`, { headers: { Authorization: token } }),
      axios.get(`${COMPANY_SERVICE_URL}/api/v1/companies`, { headers: { Authorization: token } }),
      axios.get(`${CONTACT_SERVICE_URL}/api/v1/contacts`, { headers: { Authorization: token } }),
      axios.get(`${INTERVIEW_SERVICE_URL}/api/v1/interviews`, { headers: { Authorization: token } })
    ]);

    // Traiter les utilisateurs
    let users = { total: 0, byRole: {}, activeUsers: 0, newThisMonth: 0 };
    if (usersStats.status === 'fulfilled' && usersStats.value.data) {
      const userData = usersStats.value.data.users || [];
      users.total = userData.length;
      users.byRole = userData.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      // Compter les utilisateurs créés ce mois
      const thisMonth = new Date();
      thisMonth.setDate(1);
      users.newThisMonth = userData.filter(u => new Date(u.createdAt) >= thisMonth).length;
      users.activeUsers = users.total; // Par défaut, tous les utilisateurs sont considérés actifs
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
      const appData = applicationsStats.value.data.applications || [];
      applications.total = appData.length;
      
      // Par statut
      applications.byStatus = appData.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {});

      // Par type
      applications.byType = appData.reduce((acc, app) => {
        const type = app.jobType || 'FULL_TIME';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      // Ce mois
      const thisMonth = new Date();
      thisMonth.setDate(1);
      applications.thisMonth = appData.filter(a => new Date(a.createdAt) >= thisMonth).length;

      // Cette semaine
      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - 7);
      applications.thisWeek = appData.filter(a => new Date(a.createdAt) >= thisWeek).length;
    }

    // Traiter les entreprises
    let companies = { total: 0, byIndustry: {}, bySize: {} };
    if (companiesStats.status === 'fulfilled' && companiesStats.value.data) {
      const companyData = companiesStats.value.data.companies || [];
      companies.total = companyData.length;
      
      // Par industrie
      companies.byIndustry = companyData.reduce((acc, company) => {
        const industry = company.industry || 'Non spécifié';
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
      }, {});

      // Par taille
      companies.bySize = companyData.reduce((acc, company) => {
        const size = company.size || 'Non spécifié';
        acc[size] = (acc[size] || 0) + 1;
        return acc;
      }, {});
    }

    // Traiter les contacts
    let contacts = { total: 0 };
    if (contactsStats.status === 'fulfilled' && contactsStats.value.data) {
      const contactData = contactsStats.value.data.contacts || [];
      contacts.total = contactData.length;
    }

    // Traiter les entretiens
    let interviews = { 
      total: 0, 
      byStatus: {}, 
      upcoming: 0, 
      completed: 0 
    };
    if (interviewsStats.status === 'fulfilled' && interviewsStats.value.data) {
      const interviewData = interviewsStats.value.data.interviews || [];
      interviews.total = interviewData.length;
      
      // Par statut
      interviews.byStatus = interviewData.reduce((acc, interview) => {
        acc[interview.status] = (acc[interview.status] || 0) + 1;
        return acc;
      }, {});

      // À venir
      const now = new Date();
      interviews.upcoming = interviewData.filter(i => 
        new Date(i.scheduledAt) > now && i.status === 'SCHEDULED'
      ).length;

      // Complétés
      interviews.completed = interviewData.filter(i => 
        i.status === 'COMPLETED'
      ).length;
    }

    // Statistiques de performance (à améliorer avec de vraies métriques)
    const performance = {
      averageResponseTime: 150, // ms
      successRate: 98.5, // %
      errorRate: 0.5 // %
    };

    // Retourner les statistiques agrégées
    res.json({
      success: true,
      statistics: {
        users,
        applications,
        companies,
        contacts,
        interviews,
        performance
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erreur récupération statistiques agrégées:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des statistiques'
    });
  }
};

module.exports = {
  getAggregatedStatistics
};

