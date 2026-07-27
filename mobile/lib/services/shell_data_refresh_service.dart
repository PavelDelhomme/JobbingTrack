import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/navigation/app_navigator.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/providers/contact_provider.dart';
import 'package:jobbingtrack_mobile/providers/followup_provider.dart';
import 'package:jobbingtrack_mobile/providers/interview_provider.dart';
import 'package:jobbingtrack_mobile/providers/notification_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/offline_business_sync_queue.dart';

/// Rafraîchit les listes métier après reprise réseau / retour premier plan (BL-26-15).
class ShellDataRefreshService {
  ShellDataRefreshService._();

  static DateTime? _lastRefreshAt;
  static const _minInterval = Duration(seconds: 4);

  static Future<void> refreshIfStale({BuildContext? context, bool force = false}) async {
    final now = DateTime.now();
    if (!force &&
        _lastRefreshAt != null &&
        now.difference(_lastRefreshAt!) < _minInterval) {
      return;
    }

    final ctx = context ?? appNavigatorKey.currentContext;
    if (ctx == null || !ctx.mounted) return;

    final auth = ctx.read<AuthProvider>();
    if (!auth.isAuthenticated) return;

    _lastRefreshAt = now;

    await auth.refreshSessionIfOnline();
    await OfflineBusinessSyncQueue.instance.flush();

    if (!ctx.mounted) return;

    final token = auth.token;
    if (token == null || token.isEmpty) return;
    final userId = auth.user?.id;

    final appProvider = ctx.read<ApplicationProvider>();
    final companyProvider = ctx.read<CompanyProvider>();
    final contactProvider = ctx.read<ContactProvider>();
    final interviewProvider = ctx.read<InterviewProvider>();
    final followUpProvider = ctx.read<FollowUpProvider>();
    final notificationProvider = ctx.read<NotificationProvider>();

    try {
      await Future.wait([
        appProvider.loadApplications(token: token, userId: userId),
        companyProvider.loadCompanies(token: token, userId: userId).catchError((_) {}),
        contactProvider.loadContacts(token: token, userId: userId).catchError((_) {}),
        interviewProvider.loadInterviews(token: token, userId: userId).catchError((_) {}),
        followUpProvider.loadFollowUps(token: token, userId: userId).catchError((_) {}),
        notificationProvider.loadNotifications(token: token, auth: auth).catchError((_) {}),
      ]);

      if (!ctx.mounted) return;

      appProvider.enrichCompanies({
        for (final c in companyProvider.companies) c.id: c.name,
      });

      await ApiService.getCalls(token: token).timeout(const Duration(seconds: 8)).catchError((_) => <Call>[]);
    } catch (e, st) {
      debugPrint('[ShellDataRefresh] $e\n$st');
    }
  }
}
