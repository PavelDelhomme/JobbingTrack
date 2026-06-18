const cronScheduler = require('../jobs/cronScheduler');
const logger = require('../utils/logger');

const JOB_CATALOG = [
  { id: 'pendingExecutions', label: 'Exécutions workflow en attente', schedule: '0 * * * *' },
  { id: 'autoFollowup', label: 'Contrôle relance auto candidatures', schedule: '0 9 * * *' },
  { id: 'autoCleanTrash', label: 'Nettoyage corbeille (>30j)', schedule: '0 2 * * *' },
  { id: 'interviewReminders', label: 'Rappels entretiens 24h', schedule: '0 8 * * *' },
  { id: 'interviewFeedbackReminders', label: 'Retour entretien attendu', schedule: '15 8 * * *' },
  { id: 'followupReminders', label: 'Relances du jour', schedule: '0 10 * * *' },
  { id: 'applicationReminders', label: 'Sans réponse >7j + NO_RESPONSE', schedule: '30 9 * * *' },
  { id: 'followUpNoResponseReminders', label: 'Relance sans réponse >5j', schedule: '15 10 * * *' },
];

function assertDevTrigger(req, res) {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ success: false, error: 'Trigger manuel désactivé en production' });
    return false;
  }
  const secret = process.env.WORKFLOW_DEV_TRIGGER_SECRET;
  if (secret) {
    const provided = req.get('X-Workflow-Dev-Secret') || req.get('x-workflow-dev-secret');
    if (provided !== secret) {
      res.status(403).json({ success: false, error: 'Secret workflow dev invalide' });
      return false;
    }
  }
  return true;
}

exports.getStatus = (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'workflow-service',
      cronStarted: true,
      jobs: JOB_CATALOG,
      environment: process.env.NODE_ENV || 'development',
    },
  });
};

exports.runDevJob = async (req, res) => {
  if (!assertDevTrigger(req, res)) return;

  const jobId = String(req.params.jobId || '').trim();
  const handler = cronScheduler.getJobHandlers()[jobId];
  if (!handler) {
    return res.status(404).json({
      success: false,
      error: 'Job inconnu',
      availableJobs: JOB_CATALOG.map((j) => j.id),
    });
  }

  try {
    logger.info(`[WORKFLOW] Trigger manuel job=${jobId}`);
    await handler();
    res.json({ success: true, data: { jobId, ranAt: new Date().toISOString() } });
  } catch (error) {
    logger.error(`[WORKFLOW] Erreur job ${jobId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Erreur exécution job',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
