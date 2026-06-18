import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/biometric_auth_service.dart';
import 'package:jobbingtrack_mobile/utils/auth_logout.dart';

/// Écran de déverrouillage : biométrie / code appareil puis session JWT (tous appareils).
class BiometricUnlockScreen extends StatefulWidget {
  const BiometricUnlockScreen({super.key});

  @override
  State<BiometricUnlockScreen> createState() => _BiometricUnlockScreenState();
}

class _BiometricUnlockScreenState extends State<BiometricUnlockScreen> {
  bool _unlocking = false;
  bool _checkingDevice = true;
  String? _error;
  String _biometricLabel = 'Biométrie';
  bool _localAuthAvailable = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _loadDeviceCapabilities();
      if (!mounted || !_localAuthAvailable) return;
      await Future<void>.delayed(const Duration(milliseconds: 350));
      if (mounted) await _tryUnlock(auto: true);
    });
  }

  Future<void> _loadDeviceCapabilities() async {
    final supported = await BiometricAuthService.isDeviceSupported();
    final enrolled = await BiometricAuthService.getEnrolledBiometrics();
    if (!mounted) return;
    setState(() {
      _checkingDevice = false;
      _localAuthAvailable = supported;
      _biometricLabel = BiometricAuthService.describeBiometrics(enrolled);
      if (!supported) {
        _error = 'Authentification locale indisponible sur cet appareil — utilisez votre mot de passe JobbingTrack';
      } else if (enrolled.isEmpty) {
        _error =
            'Aucune empreinte enregistrée sur cet appareil — le code PIN Android ou votre mot de passe JobbingTrack fonctionneront';
      }
    });
  }

  Future<void> _tryUnlock({bool auto = false}) async {
    if (_unlocking || !_localAuthAvailable) return;
    setState(() {
      _unlocking = true;
      if (auto) _error = null;
    });

    final result = await BiometricAuthService.authenticate(
      reason: 'Confirmez votre identité pour ouvrir JobbingTrack',
    );
    if (!mounted) return;

    if (!result.success) {
      setState(() {
        _unlocking = false;
        _error = result.errorMessage ?? 'Déverrouillage annulé ou refusé';
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
      _error = 'Session expirée — saisissez votre mot de passe JobbingTrack';
    });
  }

  Future<void> _unlockWithPassword() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.user;
    if (user == null) {
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
      return;
    }

    final controller = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Mot de passe JobbingTrack'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Compte : ${user.email}',
              style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              obscureText: true,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Mot de passe',
                border: OutlineInputBorder(),
              ),
              onSubmitted: (_) => Navigator.pop(ctx, true),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Déverrouiller')),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    setState(() {
      _unlocking = true;
      _error = null;
    });
    try {
      await auth.verifyPasswordForBiometric(controller.text.trim());
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/home');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _unlocking = false;
        _error = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Icon(Icons.fingerprint, size: 80, color: Colors.blue.shade700),
                  const SizedBox(height: 24),
                  Text(
                    'Déverrouiller',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    user != null ? 'Bonjour ${user.firstName}' : 'Session enregistrée',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey.shade700, fontSize: 15),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    auth.isAuthenticated
                        ? 'Confirmez votre identité pour continuer'
                        : _biometricLabel,
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                  ),
                  const SizedBox(height: 32),
                  if (_checkingDevice || _unlocking)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: CircularProgressIndicator(),
                    )
                  else ...[
                    if (_localAuthAvailable)
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: _tryUnlock,
                          icon: const Icon(Icons.fingerprint),
                          label: Text('Utiliser $_biometricLabel'),
                        ),
                      ),
                    if (_localAuthAvailable) const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _unlockWithPassword,
                        icon: const Icon(Icons.lock_outline),
                        label: const Text('Mot de passe JobbingTrack'),
                      ),
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 20),
                    Text(
                      _error!,
                      style: TextStyle(color: Colors.red.shade700, height: 1.35),
                      textAlign: TextAlign.center,
                    ),
                  ],
                  const SizedBox(height: 32),
                  TextButton.icon(
                    onPressed: () => AuthLogout.confirmAndPerform(context),
                    icon: Icon(Icons.logout, color: Colors.red.shade700, size: 20),
                    label: Text(
                      'Se déconnecter',
                      style: TextStyle(color: Colors.red.shade700),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
