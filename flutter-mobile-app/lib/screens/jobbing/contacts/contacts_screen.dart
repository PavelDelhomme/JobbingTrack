import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/theme/app_colors.dart';
import 'package:jobbingtrack_flutter/core/widgets/widgets.dart';

class ContactsScreen extends StatelessWidget {
  const ContactsScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context) {
    return FeaturePlaceholderScreen(
      title: 'Contacts',
      icon: Icons.people,
      headline: 'Gestion des contacts',
      accentColor: AppColors.green,
      embedded: embedded,
    );
  }
}
