const express = require('express');
const cors = require('cors');
const notificationRoutes = require('./routes/notification.routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:5002'],
  credentials: true
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/api/v1/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`notification-service demarre sur le port ${PORT}`);
});

module.exports = app;
