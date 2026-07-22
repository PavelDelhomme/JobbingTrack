import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/navigation/app_routes.dart';
import 'package:jobbingtrack_flutter/core/theme/app_colors.dart';
import 'package:jobbingtrack_flutter/core/theme/app_spacing.dart';
import 'package:jobbingtrack_flutter/core/widgets/widgets.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_flutter/providers/auth_provider.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final greeting = user == null ? 'Bonjour 👋' : 'Bonjour ${user.firstName} 👋';

    return SafeArea(
      child: Column(
        children: [
          AppPageHeader(
            title: greeting,
            subtitle: 'Gérez vos candidatures en un coup d’œil',
            showBack: false,
            trailing: IconButton(
              onPressed: () async {
                await context.read<AuthProvider>().logout();
                if (context.mounted) {
                  Navigator.of(context)
                      .pushNamedAndRemoveUntil(AppRoutes.login, (_) => false);
                }
              },
              icon: const Icon(Icons.logout, size: 28),
              tooltip: 'Déconnexion',
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.page),
            child: Row(
              children: const [
                Expanded(
                  child: StatCard(
                    value: '5',
                    label: 'Candidatures',
                    icon: Icons.assignment,
                    color: AppColors.primary,
                  ),
                ),
                SizedBox(width: AppSpacing.lg),
                Expanded(
                  child: StatCard(
                    value: '2',
                    label: 'Entretiens',
                    icon: Icons.event_available,
                    color: AppColors.green,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.page),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Actions rapides',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Expanded(
                    child: GridView.count(
                      crossAxisCount: 2,
                      mainAxisSpacing: AppSpacing.lg,
                      crossAxisSpacing: AppSpacing.lg,
                      children: [
                        ActionTile(
                          emoji: '📝',
                          label: 'Candidatures',
                          color: AppColors.primary,
                          onTap: () => Navigator.of(context)
                              .pushNamed(AppRoutes.applications),
                        ),
                        ActionTile(
                          emoji: '🏢',
                          label: 'Entreprises',
                          color: AppColors.purple,
                          onTap: () => Navigator.of(context)
                              .pushNamed(AppRoutes.companies),
                        ),
                        ActionTile(
                          emoji: '👤',
                          label: 'Contacts',
                          color: AppColors.green,
                          onTap: () => Navigator.of(context)
                              .pushNamed(AppRoutes.contacts),
                        ),
                        ActionTile(
                          emoji: '📅',
                          label: 'Entretiens',
                          color: AppColors.orange,
                          onTap: () => Navigator.of(context)
                              .pushNamed(AppRoutes.interviews),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
