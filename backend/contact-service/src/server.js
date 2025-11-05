const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Routes
const contactRoutes = require('./routes/contact.routes');
app.use('/api/v1/contacts', contactRoutes);

// Démarrage
app.listen(PORT, () => {
  console.log(`🚀 contact-service démarré sur le port ${PORT}`);
});

module.exports = app;
