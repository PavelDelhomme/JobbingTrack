import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/theme/app_colors.dart';
import 'package:jobbingtrack_flutter/core/widgets/widgets.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context) {
    return FeaturePlaceholderScreen(
      title: 'Profil',
      icon: Icons.person,
      headline: 'Gestion du profil',
      accentColor: AppColors.primary,
      embedded: embedded,
    );
  }
}
