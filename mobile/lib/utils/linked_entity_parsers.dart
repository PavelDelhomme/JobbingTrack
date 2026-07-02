import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/company.dart';

List<Map<String, dynamic>> parseNestedCompanies(List<dynamic>? raw) {
  if (raw == null) return [];
  return raw
      .map((e) {
        if (e is Map && e['company'] is Map) {
          return Map<String, dynamic>.from(e['company'] as Map);
        }
        if (e is Map) return Map<String, dynamic>.from(e);
        return <String, dynamic>{};
      })
      .where((m) => m['id'] != null || m['name'] != null)
      .toList();
}

List<Map<String, dynamic>> parseNestedApplications(List<dynamic>? raw) {
  if (raw == null) return [];
  return raw
      .map((e) {
        if (e is Map && e['application'] is Map) {
          return Map<String, dynamic>.from(e['application'] as Map);
        }
        if (e is Map) return Map<String, dynamic>.from(e);
        return <String, dynamic>{};
      })
      .where((m) => m['id'] != null)
      .toList();
}

Application? applicationFromLinkedMap(Map<String, dynamic>? raw) {
  if (raw == null || raw['id'] == null) return null;
  try {
    return Application.fromJson(raw);
  } catch (_) {
    return null;
  }
}

Company? companyFromLinkedMap(Map<String, dynamic>? raw) {
  if (raw == null || raw['id'] == null) return null;
  try {
    return Company.fromJson(raw);
  } catch (_) {
    return null;
  }
}

Map<String, dynamic>? nestedMap(dynamic value, String key) {
  if (value is Map && value[key] is Map) {
    return Map<String, dynamic>.from(value[key] as Map);
  }
  if (value is Map) return Map<String, dynamic>.from(value);
  return null;
}

String contactDisplayNameFromMap(Map<String, dynamic>? c) {
  if (c == null) return 'Contact';
  final first = c['firstName']?.toString().trim() ?? '';
  final last = c['lastName']?.toString().trim() ?? '';
  final full = '$first $last'.trim();
  if (full.isNotEmpty) return full;
  return c['email']?.toString() ?? 'Contact';
}

/// Contact lié exploitable (id + au moins un libellé) — évite navigation vers fiche vide.
bool isMeaningfulContactMap(Map<String, dynamic>? c) {
  if (c == null) return false;
  final id = c['id']?.toString().trim();
  if (id == null || id.isEmpty) return false;
  final first = c['firstName']?.toString().trim() ?? '';
  final last = c['lastName']?.toString().trim() ?? '';
  final email = c['email']?.toString().trim() ?? '';
  final phone = c['phone']?.toString().trim() ?? '';
  return '$first$last$email$phone'.isNotEmpty;
}
