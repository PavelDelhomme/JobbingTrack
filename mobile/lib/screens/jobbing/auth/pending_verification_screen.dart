import 'package:flutter/material.dart';

/// Écran affiché après une inscription réussie : indique à l'utilisateur de vérifier
/// son email via le lien envoyé, avant de pouvoir se connecter.
/// Évite de revenir directement au login et clarifie le flux (attendre le mail, cliquer le lien, puis se connecter).
class PendingVerificationScreen extends StatelessWidget {
  final String email;

  const PendingVerificationScreen({super.key, required this.email});

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
      appBar: AppBar(
        title: const Text('Vérification requise'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 48),
              Icon(Icons.mark_email_unread_outlined, size: 80, color: Colors.blue[600]),
              const SizedBox(height: 24),
              Text(
                'Vérifiez votre email',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.blue[800]),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                'Un lien de vérification a été envoyé à :',
                style: TextStyle(fontSize: 16, color: Colors.grey[700]),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                email,
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.blue[700]),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              Text(
                'Ouvrez votre boîte mail (Gmail, Proton, BlueMail, etc.), cliquez sur le lien dans l\'email pour activer votre compte, puis revenez ici pour vous connecter.',
                style: TextStyle(fontSize: 14, color: Colors.grey[600], height: 1.4),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue[600],
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Aller à la connexion', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
      ),
    );
  }
}
