const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const workflowRoutes = require('./routes/workflowRoutes');
const ruleRoutes = require('./routes/ruleRoutes');
const cronScheduler = require('./jobs/cronScheduler');

const app = express();
const PORT = process.env.PORT || 3013;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'workflow-service', timestamp: new Date().toISOString() });
});

app.use('/api/v1/workflow', workflowRoutes);
app.use('/api/v1/workflows', workflowRoutes); // alias pour gateway/test (GET /api/v1/workflows attendu 200)
app.use('/api/v1/rules', ruleRoutes);

// Démarrage du planificateur de tâches
cronScheduler.start();

app.listen(PORT, () => {
  console.log(`🔄 Workflow Service running on port ${PORT}`);
});
