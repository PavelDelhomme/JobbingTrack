import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/theme/app_colors.dart';
import 'package:jobbingtrack_flutter/core/widgets/widgets.dart';

/// Écran placeholder réutilisant le kit (évite de dupliquer header/empty).
class FeaturePlaceholderScreen extends StatelessWidget {
  const FeaturePlaceholderScreen({
    super.key,
    required this.title,
    required this.icon,
    required this.headline,
    this.message = 'Cette fonctionnalité sera bientôt disponible',
    this.accentColor = AppColors.primary,
    this.embedded = false,
    this.floatingActionButton,
  });

  final String title;
  final IconData icon;
  final String headline;
  final String message;
  final Color accentColor;
  final bool embedded;
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context) {
    final body = EmptyState(icon: icon, title: headline, message: message);

    if (embedded) {
      return Scaffold(
        floatingActionButton: floatingActionButton,
        body: SafeArea(
          child: Column(
            children: [
              AppPageHeader(
                title: title,
                showBack: false,
                accentColor: accentColor,
              ),
              Expanded(child: body),
            ],
          ),
        ),
      );
    }

    return AppPageScaffold(
      title: title,
      accentColor: accentColor,
      body: body,
      floatingActionButton: floatingActionButton,
    );
  }
}
