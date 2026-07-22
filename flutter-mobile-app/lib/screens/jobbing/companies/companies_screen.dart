import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/theme/app_colors.dart';
import 'package:jobbingtrack_flutter/core/widgets/widgets.dart';

class CompaniesScreen extends StatelessWidget {
  const CompaniesScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context) {
    return FeaturePlaceholderScreen(
      title: 'Entreprises',
      icon: Icons.business,
      headline: 'Gestion des entreprises',
      accentColor: AppColors.purple,
      embedded: embedded,
    );
  }
}
