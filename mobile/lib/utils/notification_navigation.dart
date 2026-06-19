import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/models/app_notification.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/navigation/app_navigator.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/applications/application_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/calls/call_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/companies/company_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/contacts/contact_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/followups/followup_detail_screen.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/interviews/interview_detail_screen.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';

enum NotificationEntityKind {
  application,
  interview,
  followUp,
  call,
  company,
  contact,
  unknown,
}

NotificationEntityKind resolveNotificationEntityKind(AppNotification notification) {
  final entity = (notification.entityType ?? '').trim().toLowerCase();
  if (entity.contains('application') || entity == 'candidature') {
    return NotificationEntityKind.application;
  }
  if (entity.contains('interview') || entity.contains('entretien')) {
    return NotificationEntityKind.interview;
  }
  if (entity.contains('follow') || entity.contains('relance')) {
    return NotificationEntityKind.followUp;
  }
  if (entity.contains('call') || entity.contains('appel')) {
    return NotificationEntityKind.call;
  }
  if (entity.contains('company') || entity.contains('entreprise')) {
    return NotificationEntityKind.company;
  }
  if (entity.contains('contact')) {
    return NotificationEntityKind.contact;
  }

  switch (notification.type.toUpperCase()) {
    case 'INTERVIEW_SCHEDULED':
      return NotificationEntityKind.interview;
    case 'FOLLOWUP_DUE':
      return NotificationEntityKind.followUp;
    case 'APPLICATION_UPDATE':
    case 'STATUS_CHANGE':
    case 'DEADLINE':
      return NotificationEntityKind.application;
    default:
      return NotificationEntityKind.unknown;
  }
}

/// Ouvre l'écran métier lié à la notification (candidature, entretien, relance, appel…).
Future<void> openNotificationTarget(
  AppNotification notification, {
  String? token,
}) async {
  final entityId = notification.entityId?.trim() ?? '';
  if (entityId.isEmpty) {
    _snack('Lien indisponible pour cette notification');
    return;
  }

  final nav = appNavigatorKey.currentState;
  if (nav == null) {
    _snack('Navigation indisponible');
    return;
  }

  final kind = resolveNotificationEntityKind(notification);

  try {
    switch (kind) {
      case NotificationEntityKind.application:
        final app = await ApiService.getApplication(entityId, token: token);
        if (!nav.mounted) return;
        await nav.push(
          MaterialPageRoute(builder: (_) => ApplicationDetailScreen(application: app)),
        );
      case NotificationEntityKind.interview:
        final raw = await ApiService.getInterviewDetail(entityId, token: token);
        if (!nav.mounted) return;
        await nav.push(
          MaterialPageRoute(builder: (_) => InterviewDetailScreen(interview: Interview.fromJson(raw))),
        );
      case NotificationEntityKind.followUp:
        final raw = await ApiService.getFollowUpDetail(entityId, token: token);
        if (!nav.mounted) return;
        await nav.push(
          MaterialPageRoute(builder: (_) => FollowupDetailScreen(followUp: FollowUp.fromJson(raw))),
        );
      case NotificationEntityKind.call:
        final raw = await ApiService.getCallDetail(entityId, token: token);
        if (!nav.mounted) return;
        await nav.push(
          MaterialPageRoute(builder: (_) => CallDetailScreen(call: Call.fromJson(raw))),
        );
      case NotificationEntityKind.company:
        final company = await ApiService.getCompany(entityId, token: token);
        if (!nav.mounted) return;
        await nav.push(
          MaterialPageRoute(builder: (_) => CompanyDetailScreen(company: company)),
        );
      case NotificationEntityKind.contact:
        final contact = await ApiService.getContact(entityId, token: token);
        if (!nav.mounted) return;
        await nav.push(
          MaterialPageRoute(builder: (_) => ContactDetailScreen(contact: contact)),
        );
      case NotificationEntityKind.unknown:
        _snack('Type de notification non reconnu');
    }
  } catch (_) {
    _snack('Impossible d\'ouvrir la page liée');
  }
}

void _snack(String message) {
  final ctx = appNavigatorKey.currentContext;
  if (ctx == null) return;
  ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(message)));
}
