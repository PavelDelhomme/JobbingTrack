const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const logger = require('../utils/logger');

// Map des noms de services (avec toutes les variantes possibles)
const SERVICE_MAP = {
  'api-gateway': 'api-gateway',
  'auth': 'auth-service',
  'application': 'application-service',
  'applications': 'application-service', // ✅ Ajout du pluriel
  'company': 'company-service',
  'companies': 'company-service', // ✅ Ajout du pluriel
  'contact': 'contact-service',
  'contacts': 'contact-service', // ✅ Ajout du pluriel
  'interview': 'interview-service',
  'interviews': 'interview-service', // ✅ Ajout du pluriel
  'notification': 'notification-service',
  'notifications': 'notification-service', // ✅ Ajout du pluriel
  'dashboard': 'dashboard-service',
  'call': 'call-service',
  'calls': 'call-service', // ✅ Ajout du pluriel
  'profile': 'profile-service',
  'profiles': 'profile-service', // ✅ Ajout du pluriel
  'event': 'event-service',
  'events': 'event-service', // ✅ Ajout du pluriel
  'followup': 'followup-service',
  'followups': 'followup-service', // ✅ Ajout du pluriel
  'frontend': 'frontend', // ✅ Ajout du frontend
  'postgres': 'postgres',
  'redis': 'redis'
};

/**
 * Récupérer les logs d'un service
 */
const getServiceLogs = async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { lines = 100, since, until, timestamps = 'true' } = req.query;

    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Seuls les administrateurs peuvent consulter les logs.'
      });
    }

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: 'Le nom du service est requis'
      });
    }

    // Mapper le nom du service
    const dockerServiceName = SERVICE_MAP[serviceName] || serviceName;
    const containerName = `jobbingtrack-${dockerServiceName}`;

    logger.info(`📋 Admin ${req.user.email} consulte les logs de: ${dockerServiceName}`);

    // Construire la commande docker logs
    let command = `docker logs ${containerName} --tail ${lines}`;
    
    if (timestamps === 'true') {
      command += ' --timestamps';
    }
    
    if (since) {
      command += ` --since ${since}`;
    }
    
    if (until) {
      command += ` --until ${until}`;
    }

    // Récupérer les logs
    const { stdout, stderr } = await execPromise(command);
    
    // Les logs Docker peuvent être sur stdout ET stderr
    const logs = stdout + stderr;

    res.json({
      success: true,
      service: dockerServiceName,
      logs: logs.trim().split('\n'),
      lines: logs.trim().split('\n').length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erreur récupération logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des logs'
    });
  }
};

/**
 * Récupérer les logs de tous les services
 */
const getAllLogs = async (req, res) => {
  try {
    const { lines = 50 } = req.query;

    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    logger.info(`📋 Admin ${req.user.email} consulte tous les logs`);

    // Récupérer les logs de tous les conteneurs
    const { stdout } = await execPromise(
      `docker ps --filter "name=jobbingtrack-" --format "{{.Names}}" | xargs -I {} sh -c 'echo "=== {} ===" && docker logs {} --tail ${lines} --timestamps 2>&1'`
    );

    res.json({
      success: true,
      logs: stdout.trim().split('\n'),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erreur récupération logs globaux:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Liste des services disponibles
 */
const getAvailableServices = async (req, res) => {
  try {
    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    const services = Object.keys(SERVICE_MAP).map(key => ({
      name: key,
      dockerName: SERVICE_MAP[key],
      containerName: `jobbingtrack-${SERVICE_MAP[key]}`
    }));

    res.json({
      success: true,
      services
    });

  } catch (error) {
    logger.error('Erreur récupération services:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Stream des logs en temps réel (Server-Sent Events)
 */
const streamServiceLogs = async (req, res) => {
  try {
    const { serviceName } = req.params;

    // Vérifier les permissions admin
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    // Mapper le nom du service
    const dockerServiceName = SERVICE_MAP[serviceName] || serviceName;
    const containerName = `jobbingtrack-${dockerServiceName}`;

    logger.info(`📋 Admin ${req.user.email} stream les logs de: ${dockerServiceName}`);

    // Configurer les headers pour Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx

    // Envoyer un message initial
    res.write(`data: ${JSON.stringify({ type: 'connected', service: dockerServiceName })}\n\n`);

    // Stream les logs via spawn
    const { spawn } = require('child_process');
    const dockerLogs = spawn('docker', ['logs', '-f', '--tail', '50', '--timestamps', containerName]);

    dockerLogs.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        res.write(`data: ${JSON.stringify({ type: 'log', content: line })}\n\n`);
      });
    });

    dockerLogs.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        res.write(`data: ${JSON.stringify({ type: 'log', content: line })}\n\n`);
      });
    });

    dockerLogs.on('error', (error) => {
      logger.error('Erreur stream logs:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    });

    // Nettoyer à la déconnexion
    req.on('close', () => {
      logger.info(`📋 Admin ${req.user.email} a fermé le stream de logs pour ${dockerServiceName}`);
      dockerLogs.kill();
      res.end();
    });

  } catch (error) {
    logger.error('Erreur stream logs:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = {
  getServiceLogs,
  getAllLogs,
  getAvailableServices,
  streamServiceLogs
};

