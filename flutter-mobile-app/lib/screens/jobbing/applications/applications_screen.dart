import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/theme/app_colors.dart';
import 'package:jobbingtrack_flutter/core/theme/app_spacing.dart';
import 'package:jobbingtrack_flutter/core/widgets/widgets.dart';
import 'package:jobbingtrack_flutter/datas/models/application.dart';
import 'package:jobbingtrack_flutter/providers/application_provider.dart';
import 'package:provider/provider.dart';

class ApplicationsScreen extends StatefulWidget {
  const ApplicationsScreen({super.key, this.embedded = false});

  /// true = onglet du MainShell (pas de bouton retour).
  final bool embedded;

  @override
  State<ApplicationsScreen> createState() => _ApplicationsScreenState();
}

class _ApplicationsScreenState extends State<ApplicationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ApplicationProvider>().loadApplications();
    });
  }

  @override
  Widget build(BuildContext context) {
    final appProvider = context.watch<ApplicationProvider>();
    final applications = appProvider.applications;

    final body = appProvider.isLoading
        ? const LoadingView()
        : applications.isEmpty
            ? const EmptyState(
                icon: Icons.inbox,
                title: 'Aucune candidature',
                message: 'Les candidatures apparaîtront ici',
              )
            : ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.page),
                itemCount: applications.length,
                itemBuilder: (context, index) {
                  return _ApplicationCard(application: applications[index]);
                },
              );

    if (widget.embedded) {
      return SafeArea(
        child: Column(
          children: [
            const AppPageHeader(
              title: 'Mes Candidatures',
              showBack: false,
            ),
            const SizedBox(height: AppSpacing.xl),
            Expanded(child: body),
          ],
        ),
      );
    }

    return AppPageScaffold(
      title: 'Mes Candidatures',
      accentColor: AppColors.primary,
      body: body,
    );
  }
}

class _ApplicationCard extends StatelessWidget {
  const _ApplicationCard({required this.application});

  final Application application;

  @override
  Widget build(BuildContext context) {
    final dateLabel = application.applicationDate.isNotEmpty
        ? application.applicationDate.split('T').first
        : DateTime.now().toString().split(' ').first;

    return EntityListCard(
      title: application.position,
      subtitle: application.company.name,
      trailing: StatusChip.fromApplicationStatus(application.status),
      onTap: () {
        AppSnackbar.show(
          context,
          'Ouverture des détails de ${application.position}',
          success: true,
        );
      },
      footer: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '📅 $dateLabel',
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
          Text(
            'Voir détails',
            style: TextStyle(fontSize: 12, color: Colors.grey[700]),
          ),
        ],
      ),
    );
  }
}
