/**
 * Template d'email de vérification
 * Inspiré de SuperTokens mais avec meilleur design
 */

function getVerificationEmailHTML({ userName, verificationLink, appName, expiryMinutes = 60 }) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vérification de votre email - ${appName}</title>
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
            background-color: #28a745;
            color: #ffffff !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: 600;
        }
        .info {
            background-color: #d1ecf1;
            border-left: 4px solid #17a2b8;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .link-fallback {
            word-break: break-all;
            color: #007bff;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">${appName}</div>
            <h1>✅ Vérifiez votre adresse email</h1>
        </div>
        
        <div class="content">
            <p>Bonjour ${userName},</p>
            
            <p>Merci de vous être inscrit sur ${appName} ! Pour compléter votre inscription, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous.</p>
            
            <div style="text-align: center;">
                <a href="${verificationLink}" class="button">Vérifier mon email</a>
            </div>
            
            <div class="info">
                <strong>ℹ️ Information :</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Ce lien est valide pendant ${expiryMinutes} minutes</li>
                    <li>Si vous n'avez pas créé de compte, ignorez cet email</li>
                    <li>Après vérification, vous pourrez utiliser toutes les fonctionnalités de ${appName}</li>
                </ul>
            </div>
            
            <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
            <p class="link-fallback">${verificationLink}</p>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${appName}. Tous droits réservés.</p>
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

function getVerificationEmailText({ userName, verificationLink, appName, expiryMinutes = 60 }) {
  return `
Vérification de votre email - ${appName}

Bonjour ${userName},

Merci de vous être inscrit sur ${appName} ! Pour compléter votre inscription, veuillez vérifier votre adresse email en cliquant sur le lien ci-dessous.

${verificationLink}

ℹ️ Information :
- Ce lien est valide pendant ${expiryMinutes} minutes
- Si vous n'avez pas créé de compte, ignorez cet email
- Après vérification, vous pourrez utiliser toutes les fonctionnalités de ${appName}

© ${new Date().getFullYear()} ${appName}. Tous droits réservés.
Cet email a été envoyé automatiquement, merci de ne pas y répondre.
  `.trim();
}

module.exports = {
  getVerificationEmailHTML,
  getVerificationEmailText,
};

