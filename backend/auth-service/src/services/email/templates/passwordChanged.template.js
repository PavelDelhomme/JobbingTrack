/**
 * Template d'email de confirmation de changement de mot de passe
 * Inspiré de SuperTokens mais avec meilleur design
 */

function getPasswordChangedEmailHTML({ userName, appName, changeTime, supportLink }) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mot de passe modifié - ${appName}</title>
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
            color: #28a745;
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
        .success-box {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
        }
        .warning-box {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
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
            <h1>✅ Mot de passe modifié</h1>
        </div>
        
        <div class="content">
            <p>Bonjour <strong>${userName}</strong>,</p>
            
            <p>Votre mot de passe a été modifié avec succès le <strong>${changeTime}</strong>.</p>
            
            <div class="success-box">
                <p style="color: #155724; font-size: 15px; line-height: 1.6; margin: 0;">
                    ✅ Votre compte est maintenant sécurisé avec votre nouveau mot de passe.
                </p>
            </div>
            
            <div class="warning-box">
                <p style="color: #856404; font-size: 14px; line-height: 1.6; margin: 0;">
                    ⚠️ <strong>Vous n'êtes pas à l'origine de ce changement ?</strong><br>
                    Contactez-nous immédiatement pour sécuriser votre compte.
                </p>
            </div>
            
            ${supportLink ? `
            <div style="text-align: center;">
                <a href="${supportLink}" class="button">Contacter le support</a>
            </div>
            ` : ''}
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

function getPasswordChangedEmailText({ userName, appName, changeTime, supportLink }) {
  return `
${appName} - Mot de passe modifié

Bonjour ${userName},

Votre mot de passe a été modifié avec succès le ${changeTime}.

✅ Votre compte est maintenant sécurisé avec votre nouveau mot de passe.

⚠️ Vous n'êtes pas à l'origine de ce changement ?

Contactez-nous immédiatement pour sécuriser votre compte.

${supportLink ? '\n' + supportLink : ''}

Cordialement,

L'équipe ${appName}

© ${new Date().getFullYear()} ${appName}. Tous droits réservés.
Cet email a été envoyé automatiquement, merci de ne pas y répondre.
  `.trim();
}

module.exports = {
  getPasswordChangedEmailHTML,
  getPasswordChangedEmailText,
};

