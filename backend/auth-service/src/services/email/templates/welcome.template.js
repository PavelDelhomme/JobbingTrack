/**
 * Template d'email de bienvenue
 * Inspiré de SuperTokens mais avec meilleur design
 */

function getWelcomeEmailHTML({ userName, appName, frontendUrl }) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenue sur ${appName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        h1 {
            color: #333;
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 30px 0;
        }
        .button {
            display: inline-block;
            background-color: #007bff;
            color: #ffffff !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: 600;
        }
        .features {
            list-style: none;
            padding: 0;
            margin: 20px 0;
        }
        .features li {
            padding: 10px 0;
            padding-left: 30px;
            position: relative;
        }
        .features li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #28a745;
            font-weight: bold;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">${appName}</div>
            <h1>🎉 Bienvenue ${userName} !</h1>
        </div>
        
        <div class="content">
            <p>Félicitations ! Votre compte ${appName} a été créé avec succès.</p>
            
            <p><strong>🚀 Vous pouvez maintenant :</strong></p>
            <ul class="features">
                <li>Suivre vos candidatures - Gardez trace de toutes vos applications</li>
                <li>Gérer vos entretiens - Planifiez et préparez vos rendez-vous</li>
                <li>Recevoir des rappels - Ne manquez plus jamais une relance</li>
                <li>Organiser vos contacts - Votre carnet d'adresses professionnel</li>
                <li>Analyser vos performances - Statistiques de vos candidatures</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="${frontendUrl}" class="button">Commencer maintenant</a>
            </div>
            
            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${appName}. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

function getWelcomeEmailText({ userName, appName, frontendUrl }) {
  return `
Bienvenue sur ${appName} !

Félicitations ${userName} ! Votre compte ${appName} a été créé avec succès.

🚀 Vous pouvez maintenant :
- Suivre vos candidatures - Gardez trace de toutes vos applications
- Gérer vos entretiens - Planifiez et préparez vos rendez-vous
- Recevoir des rappels - Ne manquez plus jamais une relance
- Organiser vos contacts - Votre carnet d'adresses professionnel
- Analyser vos performances - Statistiques de vos candidatures

Commencer maintenant : ${frontendUrl}

Si vous avez des questions, n'hésitez pas à nous contacter.

© ${new Date().getFullYear()} ${appName}. Tous droits réservés.
  `.trim();
}

module.exports = {
  getWelcomeEmailHTML,
  getWelcomeEmailText,
};

