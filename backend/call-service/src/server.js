const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const callRoutes = require('./routes/call.routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const PORT = process.env.PORT || 3008;

const app = express();

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'call-service',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/v1/calls', callRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 call-service démarré sur le port ${PORT}`);
});

module.exports = app;

