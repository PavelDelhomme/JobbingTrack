#!/usr/bin/env python3
"""
Service Python d'envoi d'emails pour JobbingTrack
Inspiré du code Django VTCBuilder
"""

import os
import sys
import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any

class EmailService:
    """Service d'envoi d'emails via SMTP"""
    
    def __init__(self):
        """Initialiser la configuration SMTP depuis les variables d'environnement"""
        self.host = os.getenv('SMTP_HOST', 'mailhog')
        # Si host est "mailhog", essayer aussi le nom de conteneur complet
        if self.host == 'mailhog':
            # Essayer d'abord le nom de service Docker Compose
            self.host = 'mailhog'  # Nom du service dans docker-compose
        self.port = int(os.getenv('SMTP_PORT', '1025'))
        self.use_tls = os.getenv('SMTP_SECURE', 'false').lower() == 'true'
        self.use_ssl = os.getenv('SMTP_USE_SSL', 'false').lower() == 'true'
        
        # Correction automatique : Port 465 nécessite SSL
        if self.port == 465 and not self.use_ssl:
            self.use_ssl = True
            self.use_tls = False  # SSL et TLS sont mutuellement exclusifs
        self.username = os.getenv('SMTP_USER', '')
        self.password = os.getenv('SMTP_PASS', '')
        self.from_email = os.getenv('SMTP_FROM', 'JobbingTrack <noreply@jobbingtrack.com>')
        self.reply_to = os.getenv('SMTP_REPLY_TO', 'noreply@jobbingtrack.com')
        self.frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:8080')
        self.app_name = 'JobbingTrack'
    
    def test_smtp_connection(self) -> bool:
        """Tester la connexion SMTP"""
        try:
            # Afficher la configuration pour debug
            print(f"🔍 Configuration SMTP:", file=sys.stderr)
            print(f"   Host: {self.host}", file=sys.stderr)
            print(f"   Port: {self.port}", file=sys.stderr)
            print(f"   TLS: {self.use_tls}", file=sys.stderr)
            print(f"   SSL: {self.use_ssl}", file=sys.stderr)
            print(f"   User: {self.username or '(none)'}", file=sys.stderr)
            print(f"", file=sys.stderr)
            
            # Pour MailHog, pas besoin d'authentification et timeout plus court
            if self.host == 'mailhog' or 'mailhog' in self.host.lower():
                print(f"📧 Connexion à MailHog (pas d'authentification)...", file=sys.stderr)
                try:
                    server = smtplib.SMTP(self.host, self.port, timeout=3)
                    server.quit()
                    print(f"✅ Connexion MailHog réussie !", file=sys.stderr)
                    return True
                except (smtplib.SMTPConnectError, OSError, ConnectionRefusedError) as e:
                    print(f"❌ Erreur connexion MailHog: {str(e)}", file=sys.stderr)
                    print(f"💡 Vérifiez que MailHog est démarré:", file=sys.stderr)
                    print(f"   docker ps | grep mailhog", file=sys.stderr)
                    print(f"   Ou démarrez-le: make up-full (inclut MailHog)", file=sys.stderr)
                    return False
            
            # Pour les autres serveurs SMTP (OVH, etc.)
            print(f"📧 Connexion à {self.host}:{self.port}...", file=sys.stderr)
            if self.use_ssl:
                print(f"   Utilisation SSL (port {self.port})", file=sys.stderr)
                server = smtplib.SMTP_SSL(self.host, self.port, timeout=15)
            else:
                server = smtplib.SMTP(self.host, self.port, timeout=15)
            
            if self.use_tls and not self.use_ssl:
                print(f"   Activation STARTTLS...", file=sys.stderr)
                server.starttls()
            
            if self.username and self.password:
                print(f"   Authentification avec {self.username}...", file=sys.stderr)
                try:
                    server.login(self.username, self.password)
                except Exception as auth_error:
                    # En cas d'erreur d'authentification, afficher plus de détails
                    print(f"   ❌ Erreur authentification: {auth_error}", file=sys.stderr)
                    print(f"   User: {self.username}", file=sys.stderr)
                    print(f"   Password length: {len(self.password)}", file=sys.stderr)
                    raise auth_error
            else:
                print(f"   Pas d'authentification requise", file=sys.stderr)
            
            server.quit()
            return True
        except smtplib.SMTPConnectError as e:
            print(f"❌ Erreur connexion SMTP (serveur inaccessible): {str(e)}", file=sys.stderr)
            print(f"💡 Vérifiez que le serveur SMTP est démarré et accessible", file=sys.stderr)
            return False
        except Exception as e:
            print(f"❌ Erreur connexion SMTP: {str(e)}", file=sys.stderr)
            print(f"   Type: {type(e).__name__}", file=sys.stderr)
            return False
    
    def send_email(
        self,
        to: str,
        subject: str,
        message: str,
        html_message: Optional[str] = None,
        from_email: Optional[str] = None,
        tracking_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Envoyer un email via SMTP
        
        Args:
            to: Adresse email du destinataire
            subject: Sujet de l'email
            message: Version texte de l'email
            html_message: Version HTML de l'email (optionnel)
            from_email: Adresse d'expéditeur (optionnel, utilise SMTP_FROM par défaut)
        
        Returns:
            Dict avec success (bool) et message (str)
        """
        try:
            from_email = from_email or self.from_email
            
            # Créer le message
            if html_message:
                msg = MIMEMultipart('alternative')
                msg['Subject'] = subject
                msg['From'] = from_email
                msg['To'] = to
                msg['Reply-To'] = self.reply_to
                
                # Ajouter le pixel de tracking si tracking_id fourni
                if tracking_id:
                    api_url = os.getenv('API_URL', os.getenv('NEXT_PUBLIC_API_URL', 'http://localhost:3000'))
                    tracking_pixel = f'<img src="{api_url}/api/v1/emails/track/{tracking_id}.png" width="1" height="1" style="display:none;" alt="" />'
                    # Ajouter le pixel à la fin du HTML
                    if '</body>' in html_message:
                        html_message = html_message.replace('</body>', f'{tracking_pixel}</body>')
                    else:
                        html_message = html_message + tracking_pixel
                
                # Ajouter les deux versions (texte et HTML)
                part1 = MIMEText(message, 'plain', 'utf-8')
                part2 = MIMEText(html_message, 'html', 'utf-8')
                msg.attach(part1)
                msg.attach(part2)
            else:
                msg = MIMEText(message, 'plain', 'utf-8')
                msg['Subject'] = subject
                msg['From'] = from_email
                msg['To'] = to
                msg['Reply-To'] = self.reply_to
            
            # Connexion SMTP
            if self.use_ssl:
                server = smtplib.SMTP_SSL(self.host, self.port, timeout=10)
            else:
                server = smtplib.SMTP(self.host, self.port, timeout=10)
            
            if self.use_tls and not self.use_ssl:
                server.starttls()
            
            if self.username and self.password:
                server.login(self.username, self.password)
            
            # Envoyer l'email
            try:
                server.send_message(msg)
                print(f"✅ Email envoyé avec succès à {to}", file=sys.stderr)
            except Exception as send_error:
                server.quit()
                raise send_error
            
            server.quit()
            
            return {
                'success': True,
                'message': f'Email envoyé avec succès à {to}',
                'details': {
                    'to': to,
                    'from': from_email,
                    'subject': subject
                }
            }
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Erreur envoi email: {error_msg}", file=sys.stderr)
            return {
                'success': False,
                'error': error_msg
            }
    
    def send_password_reset_email(self, user_email: str, user_name: str, reset_token: str, user_id: str, tracking_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Envoyer un email de réinitialisation de mot de passe
        
        Args:
            user_email: Email de l'utilisateur
            user_name: Nom de l'utilisateur
            reset_token: Token de réinitialisation
            user_id: ID de l'utilisateur
        
        Returns:
            Dict avec success (bool) et message (str)
        """
        reset_link = f"{self.frontend_url}/reset-password/{reset_token}"
        subject = '🔐 Réinitialisation de votre mot de passe JobbingTrack'
        
        message = f'''
Bonjour {user_name},

Vous avez demandé à réinitialiser votre mot de passe sur {self.app_name}.

Cliquez sur le lien suivant pour réinitialiser votre mot de passe :
{reset_link}

Ce lien est valide pendant 60 minutes.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

Cordialement,
L'équipe {self.app_name}
        '''.strip()
        
        html_message = f'''
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #3b82f6; margin: 0;">{self.app_name}</h1>
            </div>
            
            <h2 style="color: #1f2937;">Réinitialisation de votre mot de passe</h2>
            
            <p>Bonjour <strong>{user_name}</strong>,</p>
            
            <p>Vous avez demandé à réinitialiser votre mot de passe sur {self.app_name}.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" 
                   style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Réinitialiser mon mot de passe
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Ou copiez-collez ce lien dans votre navigateur :<br>
                <a href="{reset_link}" style="color: #3b82f6; word-break: break-all;">{reset_link}</a>
            </p>
            
            <p style="color: #dc2626; font-size: 14px;">
                ⚠️ Ce lien est valide pendant <strong>60 minutes</strong>.
            </p>
            
            <p style="color: #666; font-size: 14px;">
                Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px;">
                Cordialement,<br>
                L'équipe {self.app_name}
            </p>
        </body>
        </html>
        '''.strip()
        
        return self.send_email(
            to=user_email,
            subject=subject,
            message=message,
            html_message=html_message
        )
    
    def send_verification_email(self, user_email: str, user_name: str, verification_token: str, user_id: str, tracking_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Envoyer un email de vérification
        
        Args:
            user_email: Email de l'utilisateur
            user_name: Nom de l'utilisateur
            verification_token: Token de vérification
            user_id: ID de l'utilisateur
        
        Returns:
            Dict avec success (bool) et message (str)
        """
        verification_link = f"{self.frontend_url}/verify-email?token={verification_token}"
        subject = '✅ Vérifiez votre adresse email - JobbingTrack'
        
        message = f'''
Bonjour {user_name},

Bienvenue sur {self.app_name} !

Veuillez vérifier votre adresse email en cliquant sur le lien suivant :
{verification_link}

Ce lien est valide pendant 60 minutes.

Si vous n'avez pas créé de compte, ignorez cet email.

Cordialement,
L'équipe {self.app_name}
        '''.strip()
        
        html_message = f'''
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #3b82f6; margin: 0;">{self.app_name}</h1>
            </div>
            
            <h2 style="color: #1f2937;">Vérification de votre adresse email</h2>
            
            <p>Bonjour <strong>{user_name}</strong>,</p>
            
            <p>Bienvenue sur {self.app_name} !</p>
            
            <p>Veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verification_link}" 
                   style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Vérifier mon email
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Ou copiez-collez ce lien dans votre navigateur :<br>
                <a href="{verification_link}" style="color: #3b82f6; word-break: break-all;">{verification_link}</a>
            </p>
            
            <p style="color: #dc2626; font-size: 14px;">
                ⚠️ Ce lien est valide pendant <strong>60 minutes</strong>.
            </p>
            
            <p style="color: #666; font-size: 14px;">
                Si vous n'avez pas créé de compte, ignorez cet email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px;">
                Cordialement,<br>
                L'équipe {self.app_name}
            </p>
        </body>
        </html>
        '''.strip()
        
        return self.send_email(
            to=user_email,
            subject=subject,
            message=message,
            html_message=html_message
        )


def main():
    """Point d'entrée principal - Interface CLI pour Node.js"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: email_service.py <action> [args...]'
        }))
        sys.exit(1)
    
    action = sys.argv[1]
    service = EmailService()
    
    if action == 'test_connection':
        # Tester la connexion SMTP
        result = service.test_smtp_connection()
        print(json.dumps({
            'success': result,
            'message': 'Connexion SMTP réussie' if result else 'Connexion SMTP échouée'
        }))
        sys.exit(0 if result else 1)
    
    elif action == 'send_password_reset':
        # Envoyer un email de réinitialisation
        if len(sys.argv) < 6:
            print(json.dumps({
                'success': False,
                'error': 'Usage: email_service.py send_password_reset <email> <name> <token> <user_id>'
            }))
            sys.exit(1)
        
        email = sys.argv[2]
        name = sys.argv[3]
        token = sys.argv[4]
        user_id = sys.argv[5]
        tracking_id = sys.argv[6] if len(sys.argv) > 6 else None
        result = service.send_password_reset_email(email, name, token, user_id, tracking_id)
        print(json.dumps(result))
        sys.exit(0 if result.get('success') else 1)
    
    elif action == 'send_verification':
        # Envoyer un email de vérification
        if len(sys.argv) < 6:
            print(json.dumps({
                'success': False,
                'error': 'Usage: email_service.py send_verification <email> <name> <token> <user_id> [tracking_id]'
            }))
            sys.exit(1)
        
        email = sys.argv[2]
        name = sys.argv[3]
        token = sys.argv[4]
        user_id = sys.argv[5]
        tracking_id = sys.argv[6] if len(sys.argv) > 6 else None
        result = service.send_verification_email(email, name, token, user_id, tracking_id)
        print(json.dumps(result))
        sys.exit(0 if result.get('success') else 1)
    
    elif action == 'send_generic':
        # Envoyer un email générique
        if len(sys.argv) < 5:
            print(json.dumps({
                'success': False,
                'error': 'Usage: email_service.py send_generic <email> <subject> <message> [html_message]'
            }))
            sys.exit(1)
        
        email = sys.argv[2]
        subject = sys.argv[3]
        message = sys.argv[4]
        html_message = sys.argv[5] if len(sys.argv) > 5 else None
        result = service.send_email(email, subject, message, html_message)
        print(json.dumps(result))
        sys.exit(0 if result.get('success') else 1)
    
    else:
        print(json.dumps({
            'success': False,
            'error': f'Action inconnue: {action}'
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()

