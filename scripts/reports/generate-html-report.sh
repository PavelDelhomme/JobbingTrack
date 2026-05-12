#!/bin/bash
# Script pour générer un rapport HTML à partir d'un JSON de performance

set -euo pipefail

JSON_FILE="$1"
OUTPUT_HTML="${2:-${JSON_FILE%.json}.html}"

if [ -z "$JSON_FILE" ] || [ ! -f "$JSON_FILE" ]; then
    echo "Usage: $0 <json_file> [output_html]"
    exit 1
fi

# Détecter le type de rapport
REPORT_TYPE="performance"
if [[ "$JSON_FILE" == *"backend"* ]]; then
    REPORT_TYPE="performance-backend"
elif [[ "$JSON_FILE" == *"frontend"* ]]; then
    REPORT_TYPE="performance-frontend"
fi

# Lire le JSON
JSON_DATA=$(cat "$JSON_FILE")

# Extraire le timestamp
TIMESTAMP=$(basename "$JSON_FILE" | sed -E 's/.*_([0-9]{8}_[0-9]{6})\.json/\1/' || echo "unknown")
DATE=$(echo "$TIMESTAMP" | sed -E 's/([0-9]{4})([0-9]{2})([0-9]{2})_([0-9]{2})([0-9]{2})([0-9]{2})/\1-\2-\3 \4:\5:\6/' || echo "N/A")

# Générer le HTML
cat > "$OUTPUT_HTML" <<EOF
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport Performance - ${TIMESTAMP}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header .meta {
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 5px;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    pre {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      border: 1px solid #e0e0e0;
      font-size: 13px;
      line-height: 1.5;
    }
    code {
      font-family: 'Courier New', monospace;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      font-size: 20px;
      margin-bottom: 15px;
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #333;
    }
    tr:hover {
      background: #f8f9fa;
    }
    @media (max-width: 768px) {
      body {
        padding: 10px;
      }
      .header {
        padding: 20px;
      }
      .content {
        padding: 15px;
      }
      .metrics-grid {
        grid-template-columns: 1fr;
      }
      pre {
        font-size: 11px;
        padding: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Rapport de Performance</h1>
      <div class="meta">
        <p><strong>Type:</strong> ${REPORT_TYPE}</p>
        <p><strong>Date:</strong> ${DATE}</p>
        <p><strong>Timestamp:</strong> ${TIMESTAMP}</p>
      </div>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>📈 Données du Rapport</h2>
        <pre><code>${JSON_DATA}</code></pre>
      </div>
    </div>
  </div>
</body>
</html>
EOF

echo "✅ Rapport HTML généré: $OUTPUT_HTML"

