import 'package:jobbingtrack_mobile/utils/list_item_meta.dart';

class FollowUp {
  final String id;
  final String applicationId;
  final DateTime scheduledDate;
  final String type; // EMAIL, PHONE, IN_PERSON
  final String status; // PENDING, COMPLETED, CANCELLED
  final String? notes;
  final DateTime? completedAt;
  final String? response;
  final String? contactDisplayName;
  final String? applicationPosition;
  final String? companyName;
  final DateTime createdAt;
  final DateTime updatedAt;

  FollowUp({
    required this.id,
    required this.applicationId,
    required this.scheduledDate,
    required this.type,
    required this.status,
    this.notes,
    this.completedAt,
    this.response,
    this.contactDisplayName,
    this.applicationPosition,
    this.companyName,
    required this.createdAt,
    required this.updatedAt,
  });

  factory FollowUp.fromJson(Map<String, dynamic> json) {
    final dateStr = json['followUpDate'] ?? json['scheduledDate'];
    String? contactName;
    final contactRaw = json['contact'];
    if (contactRaw is Map) {
      final first = contactRaw['firstName']?.toString().trim() ?? '';
      final last = contactRaw['lastName']?.toString().trim() ?? '';
      final full = '$first $last'.trim();
      contactName = full.isNotEmpty ? full : contactRaw['email']?.toString();
    } else if (json['contacts'] is List) {
      for (final item in json['contacts'] as List) {
        if (item is! Map) continue;
        final c = item['contact'];
        if (c is Map) {
          final first = c['firstName']?.toString().trim() ?? '';
          final last = c['lastName']?.toString().trim() ?? '';
          final full = '$first $last'.trim();
          if (full.isNotEmpty) {
            contactName = full;
            break;
          }
          final email = c['email']?.toString().trim();
          if (email != null && email.isNotEmpty) {
            contactName = email;
            break;
          }
        }
      }
    }
    final linked = parseLinkedAppCompany(json);
    return FollowUp(
      id: json['id']?.toString() ?? '',
      applicationId: json['applicationId']?.toString() ?? '',
      scheduledDate: dateStr != null ? DateTime.tryParse(dateStr.toString()) ?? DateTime.now() : DateTime.now(),
      type: json['type']?.toString() ?? json['followUpTypeId']?.toString() ?? 'EMAIL',
      status: _readStatus(json['status']) ?? _readStatus(json['statusId']) ?? 'PENDING',
      notes: json['notes']?.toString(),
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'].toString())
          : null,
      response: json['response']?.toString(),
      contactDisplayName: contactName,
      applicationPosition: linked.position,
      companyName: linked.companyName,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  static String? _readStatus(dynamic v) {
    if (v == null) return null;
    if (v is String) return v;
    if (v is Map && v['code'] != null) return v['code'] as String?;
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'applicationId': applicationId,
      'scheduledDate': scheduledDate.toIso8601String(),
      'type': type,
      'status': status,
      'notes': notes,
      'completedAt': completedAt?.toIso8601String(),
      'response': response,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      if (applicationPosition != null) 'application': {'position': applicationPosition},
      if (companyName != null) 'company': {'name': companyName},
    };
  }
}
