import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';

/// Écran affiché quand l'utilisateur ouvre le lien de vérification d'email (deep link ou route avec token).
/// Appelle l'API verify-email puis affiche succès ou erreur et propose d'aller vers la connexion.
class VerifyEmailScreen extends StatefulWidget {
  /// Token reçu par email (query param ou path).
  final String? token;

  const VerifyEmailScreen({super.key, this.token});

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  bool _isLoading = true;
  bool _success = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (widget.token != null && widget.token!.isNotEmpty) {
      _verify();
    } else {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Lien invalide : token manquant.';
      });
    }
  }

  Future<void> _verify() async {
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.verifyEmail(widget.token!);
      if (mounted) {
        setState(() {
          _isLoading = false;
          _success = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _success = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (_isLoading) ...[
                const CircularProgressIndicator(),
                const SizedBox(height: 24),
                Text('Vérification de votre email...', style: TextStyle(fontSize: 16, color: Colors.grey[600])),
              ] else if (_success) ...[
                Icon(Icons.mark_email_read, size: 80, color: Colors.green[600]),
                const SizedBox(height: 24),
                Text('Email vérifié', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.green[800])),
                const SizedBox(height: 8),
                Text('Votre compte est actif. Vous pouvez vous connecter.', style: TextStyle(fontSize: 14, color: Colors.grey[600]), textAlign: TextAlign.center),
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
              ] else ...[
                Icon(Icons.error_outline, size: 80, color: Colors.red[600]),
                const SizedBox(height: 24),
                Text('Échec de la vérification', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.red[800])),
                const SizedBox(height: 8),
                Text(_errorMessage ?? 'Lien invalide ou expiré.', style: TextStyle(fontSize: 14, color: Colors.grey[700]), textAlign: TextAlign.center),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.blue[600],
                      side: BorderSide(color: Colors.blue[600]!),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Retour à la connexion', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
