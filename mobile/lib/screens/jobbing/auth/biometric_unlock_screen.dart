import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';
import 'package:jobbingtrack_mobile/services/biometric_auth_service.dart';

/// Écran de déverrouillage : biométrie puis session JWT ou reconnexion sécurisée (D6).
class BiometricUnlockScreen extends StatefulWidget {
  const BiometricUnlockScreen({super.key});

  @override
  State<BiometricUnlockScreen> createState() => _BiometricUnlockScreenState();
}

class _BiometricUnlockScreenState extends State<BiometricUnlockScreen> {
  bool _unlocking = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _tryUnlock());
  }

  Future<void> _tryUnlock() async {
    if (_unlocking) return;
    setState(() {
      _unlocking = true;
      _error = null;
    });
    final ok = await BiometricAuthService.authenticate(
      reason: 'Confirmez votre identité pour ouvrir JobbingTrack',
    );
    if (!mounted) return;
    if (!ok) {
      setState(() {
        _unlocking = false;
        _error = 'Déverrouillage annulé ou refusé';
      });
      return;
    }

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final sessionOk = await auth.ensureSessionAfterBiometric();
    if (!mounted) return;
    if (sessionOk) {
      Navigator.of(context).pushReplacementNamed('/home');
      return;
    }
    setState(() {
      _unlocking = false;
      _error = 'Session expirée — reconnectez-vous avec votre mot de passe';
    });
  }

  Future<void> _usePasswordInstead() async {
    await ApiConfigStore.clearAuthSession();
    await ApiConfigStore.saveBiometricUnlockEnabled(false);
    if (!mounted) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.disableBiometricUnlock();
    await auth.clearLocalSession();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.fingerprint, size: 72, color: Colors.blue.shade700),
              const SizedBox(height: 20),
              const Text(
                'Déverrouiller',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                user != null ? 'Bonjour ${user.firstName}' : 'Session enregistrée',
                style: TextStyle(color: Colors.grey.shade700),
              ),
              const SizedBox(height: 32),
              if (_unlocking)
                const CircularProgressIndicator()
              else ...[
                FilledButton.icon(
                  onPressed: _tryUnlock,
                  icon: const Icon(Icons.fingerprint),
                  label: const Text('Utiliser la biométrie'),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: _usePasswordInstead,
                  child: const Text('Se connecter avec le mot de passe'),
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(_error!, style: TextStyle(color: Colors.red.shade700), textAlign: TextAlign.center),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
