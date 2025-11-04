const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration CORS
app.use(cors());

// Servir les fichiers statiques de Flutter Web
app.use(express.static(path.join(__dirname, 'build/web')));

// API pour contrôler l'application Flutter
app.get('/api/status', (req, res) => {
  res.json({ status: 'running', framework: 'flutter' });
});

app.post('/api/reload', (req, res) => {
  // Ici on pourrait envoyer un signal pour recharger Flutter
  res.json({ success: true, action: 'reload', framework: 'flutter' });
});

app.post('/api/hot-restart', (req, res) => {
  // Ici on pourrait déclencher un hot restart Flutter
  res.json({ success: true, action: 'hot-restart', framework: 'flutter' });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>JobbingTrack Flutter Mobile</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f3f4f6;
          overflow: hidden;
        }

        .emulator-container {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .device-frame {
          background: #000;
          border-radius: 25px;
          padding: 20px;
          box-shadow: 0 25px 50px rgba(0,0,0,0.3);
          position: relative;
          transform: scale(0.8);
        }

        .device-screen {
          width: 375px;
          height: 667px;
          background: #fff;
          border-radius: 15px;
          position: relative;
          overflow: hidden;
        }

        .status-bar {
          height: 20px;
          background: rgba(0,0,0,0.9);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 15px;
          color: white;
          font-size: 12px;
          font-weight: 600;
        }

        .status-left {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .status-right {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .home-indicator {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 134px;
          height: 5px;
          background: rgba(255,255,255,0.3);
          border-radius: 3px;
        }

        .flutter-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #02569b;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #02569b;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .iframe-container {
          width: 100%;
          height: calc(100% - 20px);
          position: relative;
        }

        iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: #fff;
        }

        .controls {
          position: absolute;
          top: 20px;
          right: 20px;
          display: flex;
          gap: 10px;
        }

        .control-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 8px 12px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 12px;
          backdrop-filter: blur(10px);
        }

        .control-btn:hover {
          background: rgba(255,255,255,0.3);
        }

        .flutter-logo {
          position: absolute;
          top: 10px;
          left: 10px;
          width: 30px;
          height: 30px;
          background: linear-gradient(45deg, #02569b, #0175c2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
        }
      </style>
    </head>
    <body>
      <div class="emulator-container">
        <div class="device-frame">
          <div class="device-screen">
            <div class="status-bar">
              <div class="status-left">
                <span>9:41</span>
              </div>
              <div class="status-right">
                <span>📶</span>
                <span>📶</span>
                <span>🔋</span>
              </div>
            </div>

            <div class="flutter-logo">F</div>

            <div class="iframe-container">
              <iframe
                id="flutter-app"
                src="/"
                onload="hideFlutterLoading()"
              ></iframe>
              <div id="flutter-loading" class="flutter-loading">
                <div class="spinner"></div>
                <span>Chargement Flutter...</span>
              </div>
            </div>

            <div class="home-indicator"></div>
          </div>
        </div>

        <div class="controls">
          <button class="control-btn" onclick="reloadFlutter()">🔄 Recharger</button>
          <button class="control-btn" onclick="hotRestartFlutter()">⚡ Hot Restart</button>
          <button class="control-btn" onclick="toggleDevMenu()">⚙️ Dev Menu</button>
        </div>
      </div>

      <script>
        function hideFlutterLoading() {
          document.getElementById('flutter-loading').style.display = 'none';
        }

        function reloadFlutter() {
          fetch('/api/reload', { method: 'POST' })
            .then(() => {
              const iframe = document.getElementById('flutter-app');
              iframe.src = iframe.src;
            })
            .catch(err => console.error('Erreur rechargement:', err));
        }

        function hotRestartFlutter() {
          fetch('/api/hot-restart', { method: 'POST' })
            .then(() => {
              const iframe = document.getElementById('flutter-app');
              iframe.src = iframe.src;
            })
            .catch(err => console.error('Erreur hot restart:', err));
        }

        function toggleDevMenu() {
          alert('Menu développeur Flutter - Hot Reload activé');
        }

        // Gestion des erreurs de chargement
        document.getElementById('flutter-app').onerror = function() {
          document.getElementById('flutter-loading').innerHTML = '<span style="color: red;">❌ Erreur de chargement Flutter</span>';
        };
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur Flutter démarré sur http://0.0.0.0:${PORT}`);
  console.log(`📱 Application Flutter Web disponible sur http://0.0.0.0:${PORT}`);
});
