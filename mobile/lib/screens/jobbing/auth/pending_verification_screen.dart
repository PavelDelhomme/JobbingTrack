import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';

/// Écran affiché après une inscription réussie : indique à l'utilisateur de vérifier
/// son email via le lien envoyé, avant de pouvoir se connecter.
class PendingVerificationScreen extends StatefulWidget {
  final String email;

  const PendingVerificationScreen({super.key, required this.email});

  @override
  State<PendingVerificationScreen> createState() => _PendingVerificationScreenState();
}

class _PendingVerificationScreenState extends State<PendingVerificationScreen> {
  bool _resending = false;
  String? _resendMessage;
  bool _resendOk = false;

  Future<void> _resend() async {
    setState(() {
      _resending = true;
      _resendMessage = null;
      _resendOk = false;
    });
    try {
      await ApiService.resendVerificationEmail(widget.email);
      if (!mounted) return;
      setState(() {
        _resendMessage = 'Un nouvel email de vérification a été envoyé.';
        _resendOk = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _resendMessage = e.toString().replaceAll('Exception: ', '');
        _resendOk = false;
      });
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

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
                  widget.email,
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.blue[700]),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                Text(
                  '1. Ouvrez votre boîte mail\n'
                  '2. Cliquez sur le lien de vérification\n'
                  '3. L\'application s\'ouvrira (ou rouvrez-la) pour confirmer\n'
                  '4. Revenez ici pour vous connecter',
                  style: TextStyle(fontSize: 14, color: Colors.grey[600], height: 1.5),
                  textAlign: TextAlign.center,
                ),
                if (_resendMessage != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _resendMessage!,
                    style: TextStyle(
                      fontSize: 13,
                      color: _resendOk ? Colors.green[700] : Colors.red[700],
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
                const SizedBox(height: 24),
                OutlinedButton.icon(
                  onPressed: _resending ? null : _resend,
                  icon: _resending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.refresh),
                  label: Text(_resending ? 'Envoi…' : 'Renvoyer l\'email de vérification'),
                ),
                const SizedBox(height: 16),
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
