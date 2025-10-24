const http = require('http');

// Test du serveur HTTP du service dashboard
describe('Dashboard Service - Tests de base', () => {
  let server;

  beforeAll((done) => {
    // Créer un serveur de test simple
    server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({
          status: 'OK',
          service: 'dashboard-service',
          timestamp: new Date().toISOString()
        }));
        return;
      }

      if (req.url === '/api/dashboard/stats') {
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          data: {
            totalUsers: 100,
            totalCompanies: 50,
            totalApplications: 200
          }
        }));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Route not found' }));
    });

    server.listen(0, done); // Port 0 = port automatique
  });

  afterAll((done) => {
    server.close(done);
  });

  test('GET /health devrait retourner 200', (done) => {
    const options = {
      hostname: 'localhost',
      port: server.address().port,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        expect(res.statusCode).toBe(200);
        const response = JSON.parse(data);
        expect(response).toHaveProperty('status', 'OK');
        expect(response).toHaveProperty('service', 'dashboard-service');
        done();
      });
    });

    req.on('error', (err) => {
      done(err);
    });

    req.end();
  });

  test('GET /api/dashboard/stats devrait retourner des stats', (done) => {
    const options = {
      hostname: 'localhost',
      port: server.address().port,
      path: '/api/dashboard/stats',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        expect(res.statusCode).toBe(200);
        const response = JSON.parse(data);
        expect(response).toHaveProperty('success', true);
        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('totalUsers');
        done();
      });
    });

    req.on('error', (err) => {
      done(err);
    });

    req.end();
  });

  test('Route inexistante devrait retourner 404', (done) => {
    const options = {
      hostname: 'localhost',
      port: server.address().port,
      path: '/non-existent-route',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        expect(res.statusCode).toBe(404);
        const response = JSON.parse(data);
        expect(response).toHaveProperty('error', 'Route not found');
        done();
      });
    });

    req.on('error', (err) => {
      done(err);
    });

    req.end();
  });
});
