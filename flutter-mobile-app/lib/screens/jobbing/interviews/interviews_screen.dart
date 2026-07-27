import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/theme/app_colors.dart';
import 'package:jobbingtrack_flutter/core/widgets/widgets.dart';

class InterviewsScreen extends StatelessWidget {
  const InterviewsScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context) {
    return FeaturePlaceholderScreen(
      title: 'Entretiens',
      icon: Icons.event_available,
      headline: 'Gestion des entretiens',
      accentColor: AppColors.orange,
      embedded: embedded,
    );
  }
}
