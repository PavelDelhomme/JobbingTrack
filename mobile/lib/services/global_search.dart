import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';

enum GlobalSearchCategory {
  all,
  application,
  company,
  contact,
  interview,
  followUp,
  call,
}

extension GlobalSearchCategoryLabel on GlobalSearchCategory {
  String get label {
    switch (this) {
      case GlobalSearchCategory.all:
        return 'Tout';
      case GlobalSearchCategory.application:
        return 'Candidatures';
      case GlobalSearchCategory.company:
        return 'Entreprises';
      case GlobalSearchCategory.contact:
        return 'Contacts';
      case GlobalSearchCategory.interview:
        return 'Entretiens';
      case GlobalSearchCategory.followUp:
        return 'Relances';
      case GlobalSearchCategory.call:
        return 'Appels';
    }
  }

  IconData get icon {
    switch (this) {
      case GlobalSearchCategory.all:
        return Icons.search;
      case GlobalSearchCategory.application:
        return Icons.assignment_outlined;
      case GlobalSearchCategory.company:
        return Icons.business_outlined;
      case GlobalSearchCategory.contact:
        return Icons.person_outline;
      case GlobalSearchCategory.interview:
        return Icons.event_outlined;
      case GlobalSearchCategory.followUp:
        return Icons.schedule_send_outlined;
      case GlobalSearchCategory.call:
        return Icons.phone_outlined;
    }
  }
}

class GlobalSearchHit {
  final GlobalSearchCategory category;
  final String title;
  final String subtitle;
  final String? meta;
  final Object payload;

  const GlobalSearchHit({
    required this.category,
    required this.title,
    required this.subtitle,
    this.meta,
    required this.payload,
  });
}

bool _matches(String query, List<String?> fields) {
  if (query.isEmpty) return false;
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return false;
  for (final field in fields) {
    if (field != null && field.toLowerCase().contains(q)) return true;
  }
  return false;
}

List<GlobalSearchHit> searchGlobal({
  required String query,
  GlobalSearchCategory category = GlobalSearchCategory.all,
  List<Application> applications = const [],
  List<Company> companies = const [],
  List<Map<String, dynamic>> contacts = const [],
  List<Interview> interviews = const [],
  List<FollowUp> followUps = const [],
  List<Call> calls = const [],
  int limitPerCategory = 40,
}) {
  final q = query.trim();
  if (q.isEmpty) return [];

  final hits = <GlobalSearchHit>[];

  if (category == GlobalSearchCategory.all || category == GlobalSearchCategory.application) {
    var count = 0;
    for (final app in applications) {
      if (!_matches(q, [
        app.position,
        app.company.name,
        app.location,
        app.description,
        app.notes,
        applicationStatusLabel(app.status),
      ])) {
        continue;
      }
      hits.add(GlobalSearchHit(
        category: GlobalSearchCategory.application,
        title: app.position,
        subtitle: app.company.name.isNotEmpty ? app.company.name : 'Sans entreprise',
        meta: formatSmartPostulationDate(app.appliedDate),
        payload: app,
      ));
      if (++count >= limitPerCategory) break;
    }
  }

  if (category == GlobalSearchCategory.all || category == GlobalSearchCategory.company) {
    var count = 0;
    for (final c in companies) {
      if (!_matches(q, [c.name, c.industry, c.location, c.website, c.description])) continue;
      hits.add(GlobalSearchHit(
        category: GlobalSearchCategory.company,
        title: c.name.isNotEmpty ? c.name : 'Entreprise',
        subtitle: c.industry.isNotEmpty ? c.industry : (c.location.isNotEmpty ? c.location : c.website),
        payload: c,
      ));
      if (++count >= limitPerCategory) break;
    }
  }

  if (category == GlobalSearchCategory.all || category == GlobalSearchCategory.contact) {
    var count = 0;
    for (final c in contacts) {
      if (!_matches(q, [
        c['firstName']?.toString(),
        c['lastName']?.toString(),
        c['email']?.toString(),
        c['phone']?.toString(),
        c['position']?.toString(),
        contactDisplayName(c),
      ])) {
        continue;
      }
      hits.add(GlobalSearchHit(
        category: GlobalSearchCategory.contact,
        title: contactDisplayName(c),
        subtitle: c['email']?.toString() ?? c['phone']?.toString() ?? '',
        payload: c,
      ));
      if (++count >= limitPerCategory) break;
    }
  }

  if (category == GlobalSearchCategory.all || category == GlobalSearchCategory.interview) {
    var count = 0;
    for (final iv in interviews) {
      if (!_matches(q, [iv.location, iv.notes, iv.videoLink])) continue;
      hits.add(GlobalSearchHit(
        category: GlobalSearchCategory.interview,
        title: iv.location?.isNotEmpty == true ? iv.location! : 'Entretien',
        subtitle: iv.notes ?? '',
        meta: formatSmartEventDate(iv.interviewDate),
        payload: iv,
      ));
      if (++count >= limitPerCategory) break;
    }
  }

  if (category == GlobalSearchCategory.all || category == GlobalSearchCategory.followUp) {
    var count = 0;
    for (final f in followUps) {
      if (!_matches(q, [f.notes, f.type, f.status, f.response, followUpStatusLabel(f.status)])) continue;
      hits.add(GlobalSearchHit(
        category: GlobalSearchCategory.followUp,
        title: f.notes?.isNotEmpty == true ? f.notes! : 'Relance',
        subtitle: followUpStatusLabel(f.status),
        meta: formatSmartEventDate(f.scheduledDate),
        payload: f,
      ));
      if (++count >= limitPerCategory) break;
    }
  }

  if (category == GlobalSearchCategory.all || category == GlobalSearchCategory.call) {
    var count = 0;
    for (final call in calls) {
      if (!_matches(q, [call.subject, call.notes, call.status])) continue;
      hits.add(GlobalSearchHit(
        category: GlobalSearchCategory.call,
        title: call.subject.isNotEmpty ? call.subject : 'Appel',
        subtitle: call.notes ?? '',
        meta: formatSmartEventDate(call.callDate),
        payload: call,
      ));
      if (++count >= limitPerCategory) break;
    }
  }

  return hits;
}

Color categoryColor(GlobalSearchCategory category) {
  switch (category) {
    case GlobalSearchCategory.application:
      return Colors.blue.shade700;
    case GlobalSearchCategory.company:
      return Colors.purple.shade700;
    case GlobalSearchCategory.contact:
      return Colors.green.shade700;
    case GlobalSearchCategory.interview:
      return Colors.orange.shade700;
    case GlobalSearchCategory.followUp:
      return Colors.teal.shade700;
    case GlobalSearchCategory.call:
      return Colors.indigo.shade700;
    case GlobalSearchCategory.all:
      return Colors.grey.shade700;
  }
}

Map<GlobalSearchCategory, List<GlobalSearchHit>> groupSearchHits(List<GlobalSearchHit> hits) {
  final map = <GlobalSearchCategory, List<GlobalSearchHit>>{};
  for (final hit in hits) {
    map.putIfAbsent(hit.category, () => []).add(hit);
  }
  return map;
}

void openGlobalSearch(BuildContext context, {bool autofocus = true}) {
  Navigator.of(context).pushNamed('/search', arguments: {'autofocus': autofocus});
}
