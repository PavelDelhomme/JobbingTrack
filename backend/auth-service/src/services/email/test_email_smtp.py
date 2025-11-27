#!/usr/bin/env python3
"""
Script de test complet pour vérifier la configuration SMTP et envoyer un email réel
Usage: python test_email_smtp.py
"""

import os
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Ajouter le répertoire parent au path pour importer email_service
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from email_service import EmailService

def test_smtp_connection():
    """Test connexion SMTP directe"""
    print("=" * 60)
    print("🔍 TEST CONNEXION SMTP DIRECTE")
    print("=" * 60)
    
    service = EmailService()
    
    host = service.host
    port = service.port
    use_tls = service.use_tls
    use_ssl = service.use_ssl
    username = service.username
    password = service.password
    
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"TLS: {use_tls}")
    print(f"SSL: {use_ssl}")
    print(f"Username: {username}")
    print(f"Password: {'*' * len(password) if password else 'NONE'}")
    print()
    
    try:
        if use_ssl:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
        
        if use_tls and not use_ssl:
            server.starttls()
        
        if username and password:
            server.login(username, password)
            print("✅ Connexion SMTP réussie !")
            server.quit()
            return True
        else:
            print("⚠️ Pas de credentials fournis")
            server.quit()
            return False
            
    except Exception as e:
        print(f"❌ Erreur connexion SMTP: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_django_config():
    """Test configuration email"""
    print("\n" + "=" * 60)
    print("🔍 TEST CONFIGURATION EMAIL")
    print("=" * 60)
    
    service = EmailService()
    
    print(f"EMAIL_HOST: {service.host}")
    print(f"EMAIL_PORT: {service.port}")
    print(f"EMAIL_USE_TLS: {service.use_tls}")
    print(f"EMAIL_USE_SSL: {service.use_ssl}")
    print(f"EMAIL_HOST_USER: {service.username}")
    print(f"EMAIL_HOST_PASSWORD: {'*' * len(service.password) if service.password else 'NONE'}")
    print(f"DEFAULT_FROM_EMAIL: {service.from_email}")
    print(f"FRONTEND_URL: {service.frontend_url}")
    print()
    
    # Vérifier si SMTP backend est utilisé
    if service.host == 'mailhog':
        print("⚠️ ATTENTION: MailHog est utilisé (emails capturés localement)")
        print("   Pour la production, configurez SMTP_HOST avec votre serveur SMTP")
        return False
    else:
        print("✅ Configuration SMTP détectée")
        return True

def test_django_send():
    """Test envoi email via service"""
    print("\n" + "=" * 60)
    print("📧 TEST ENVOI EMAIL VIA SERVICE")
    print("=" * 60)
    
    service = EmailService()
    recipient = os.getenv('TEST_EMAIL', 'redacted@example.invalid')
    
    try:
        print(f"Envoi d'un email de test à {recipient}...")
        print()
        
        result = service.send_email(
            to=recipient,
            subject='🧪 TEST EMAIL SMTP - JobbingTrack',
            message=f'''
Ceci est un email de TEST pour vérifier que la configuration SMTP fonctionne.

Si vous recevez cet email, c'est que la configuration SMTP est correcte !

Date: {service.frontend_url}
Host: {service.host}:{service.port}

Cordialement,
L'équipe {service.app_name}
            '''.strip(),
            html_message=f'''
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>🧪 TEST EMAIL SMTP - JobbingTrack</h2>
                <p>Ceci est un email de <strong>TEST</strong> pour vérifier que la configuration SMTP fonctionne.</p>
                <p>Si vous recevez cet email, c'est que la configuration SMTP est <strong style="color: green;">CORRECTE</strong> !</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    Date: {service.frontend_url}<br>
                    Host: {service.host}:{service.port}
                </p>
                <p style="color: #666; font-size: 12px;">Cordialement,<br>L'équipe {service.app_name}</p>
            </body>
            </html>
            '''.strip()
        )
        
        if result.get('success'):
            print("✅ Email envoyé avec succès via service !")
            print(f"📬 Vérifiez la boîte mail de {recipient}")
            return True
        else:
            print(f"❌ Erreur lors de l'envoi de l'email: {result.get('error')}")
            return False
        
    except Exception as e:
        print(f"❌ Erreur lors de l'envoi de l'email: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Fonction principale"""
    print("\n" + "=" * 60)
    print("🚀 TEST COMPLET CONFIGURATION EMAIL SMTP")
    print("=" * 60)
    print()
    
    # Test 1: Configuration
    config_ok = test_django_config()
    
    # Test 2: Connexion SMTP directe
    smtp_ok = test_smtp_connection()
    
    # Test 3: Envoi via service
    if config_ok and smtp_ok:
        send_ok = test_django_send()
    else:
        print("\n⚠️ Impossible de tester l'envoi: configuration incorrecte")
        send_ok = False
    
    # Résumé
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ DES TESTS")
    print("=" * 60)
    print(f"Configuration: {'✅ OK' if config_ok else '❌ ÉCHEC'}")
    print(f"Connexion SMTP: {'✅ OK' if smtp_ok else '❌ ÉCHEC'}")
    print(f"Envoi email: {'✅ OK' if send_ok else '❌ ÉCHEC'}")
    print()
    
    if not config_ok:
        print("💡 SOLUTION:")
        print("   1. Vérifier que les variables d'environnement sont définies dans docker-compose.yml")
        print("   2. Redémarrer Docker: docker-compose restart auth-service")
        print("   3. Vérifier les variables: docker-compose exec auth-service env | grep SMTP")
    
    return config_ok and smtp_ok and send_ok

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

