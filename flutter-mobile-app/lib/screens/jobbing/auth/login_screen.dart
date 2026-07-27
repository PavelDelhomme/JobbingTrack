import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/navigation/app_routes.dart';
import 'package:jobbingtrack_flutter/core/theme/app_colors.dart';
import 'package:jobbingtrack_flutter/core/theme/app_spacing.dart';
import 'package:jobbingtrack_flutter/core/widgets/widgets.dart';
import 'package:jobbingtrack_flutter/providers/auth_provider.dart';
import 'package:provider/provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscure = true;
  bool _busy = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      AppSnackbar.show(context, 'Veuillez saisir votre email');
      return;
    }
    if (_passwordController.text.isEmpty) {
      AppSnackbar.show(context, 'Veuillez saisir votre mot de passe');
      return;
    }

    setState(() => _busy = true);
    try {
      await context.read<AuthProvider>().login(email, _passwordController.text);
      if (!mounted) return;
      AppSnackbar.show(context, 'Connexion réussie !', success: true);
      Navigator.of(context).pushReplacementNamed(AppRoutes.shell);
    } catch (e) {
      if (!mounted) return;
      AppSnackbar.show(context, e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl),
          child: Column(
            children: [
              const SizedBox(height: 60),
              Container(
                width: 80,
                height: 80,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.track_changes,
                  color: Colors.white,
                  size: 40,
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
              const Text(
                'JobbingTrack',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDark,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              const Text(
                'Suivez vos candidatures facilement',
                style: TextStyle(fontSize: 16, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 48),
              Container(
                padding: const EdgeInsets.all(AppSpacing.xxl),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    AppTextField(
                      controller: _emailController,
                      label: 'Email',
                      hint: 'vous@exemple.com',
                      prefixIcon: Icons.email,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppTextField(
                      controller: _passwordController,
                      label: 'Mot de passe',
                      hint: '••••••••',
                      prefixIcon: Icons.lock,
                      obscureText: _obscure,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _login(),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscure ? Icons.visibility_off : Icons.visibility,
                        ),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),
                    AppPrimaryButton(
                      label: 'Se connecter',
                      loading: _busy,
                      onPressed: _login,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: AppColors.border.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                ),
                child: const Text(
                  'Astuce : utilisez un compte existant de l’API locale '
                  '(gateway :5002) une fois le proto branché en réel.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}
