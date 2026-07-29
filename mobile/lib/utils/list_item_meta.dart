import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';

/// Extrait poste + entreprise depuis un payload API (application / company imbriqués).
({String? position, String? companyName}) parseLinkedAppCompany(Map<String, dynamic> json) {
  String? position;
  String? companyName;

  final app = json['application'];
  if (app is Map) {
    final p = app['position']?.toString().trim() ?? '';
    if (p.isNotEmpty) position = p;
    final co = app['company'];
    if (co is Map) {
      final n = co['name']?.toString().trim() ?? '';
      if (n.isNotEmpty) companyName = n;
    }
  }

  final company = json['company'];
  if ((companyName == null || companyName.isEmpty) && company is Map) {
    final n = company['name']?.toString().trim() ?? '';
    if (n.isNotEmpty) companyName = n;
  }

  return (position: position, companyName: companyName);
}

/// Complète poste/entreprise via le provider candidatures si l’API n’a pas tout renvoyé.
({String position, String companyName}) resolveAppCompanyLabels({
  required String applicationId,
  String? position,
  String? companyName,
  List<Application>? applications,
}) {
  var pos = position?.trim() ?? '';
  var co = companyName?.trim() ?? '';
  if ((pos.isEmpty || co.isEmpty) &&
      applicationId.isNotEmpty &&
      applications != null) {
    for (final a in applications) {
      if (a.id != applicationId) continue;
      if (pos.isEmpty && a.position.trim().isNotEmpty) pos = a.position.trim();
      if (co.isEmpty && a.company.name.trim().isNotEmpty) {
        co = a.company.name.trim();
      }
      break;
    }
  }
  return (position: pos, companyName: co);
}

String joinListMeta(Iterable<String?> parts) {
  return parts
      .map((p) => p?.trim() ?? '')
      .where((p) => p.isNotEmpty)
      .join(' · ');
}

/// Sous-titre carte liste entreprise (métadonnées + compteurs).
String companyListSubtitle(Company c) {
  final parts = <String>[
    if (c.industry.isNotEmpty) c.industry,
    if (c.location.isNotEmpty) c.location,
    if (c.size.isNotEmpty) c.size,
    if (c.website.isNotEmpty) c.website,
  ];
  if (c.companyType == 'TEMP_AGENCY') {
    parts.add('Intérim');
  }
  final apps = c.applicationsCount;
  final contacts = c.contactsCount;
  if (apps != null) {
    parts.add(apps <= 1 ? '$apps candidature' : '$apps candidatures');
  }
  if (contacts != null) {
    parts.add(contacts <= 1 ? '$contacts contact' : '$contacts contacts');
  }
  return parts.join(' · ');
}

/// Sous-titre carte liste contact : entreprise + coordonnées (+ poste).
String contactListSubtitle(Map<String, dynamic> contact) {
  final email = contact['email']?.toString().trim() ?? '';
  final phone = contact['phone']?.toString().trim() ?? '';
  final position = contact['position']?.toString().trim() ?? '';
  return joinListMeta([
    contactPrimaryCompanyName(contact),
    if (position.isNotEmpty) position,
    if (email.isNotEmpty) email,
    if (phone.isNotEmpty) phone,
  ]);
}

/// Ligne « poste · entreprise » pour relance / entretien / appel.
String linkedOfferCompanyLine({
  required String applicationId,
  String? position,
  String? companyName,
  List<Application>? applications,
}) {
  final resolved = resolveAppCompanyLabels(
    applicationId: applicationId,
    position: position,
    companyName: companyName,
    applications: applications,
  );
  return joinListMeta([resolved.position, resolved.companyName]);
}
