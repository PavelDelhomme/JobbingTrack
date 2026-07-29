import 'package:jobbingtrack_mobile/utils/list_item_meta.dart';

class Call {
  final String id;
  final String applicationId;
  final String? contactId;
  final String? companyId;
  final DateTime callDate;
  final String subject;
  final String? notes;
  final String? status;
  final String? contactFirstName;
  final String? contactLastName;
  final String? applicationPosition;
  final String? companyName;
  final DateTime createdAt;
  final DateTime updatedAt;

  Call({
    required this.id,
    required this.applicationId,
    this.contactId,
    this.companyId,
    required this.callDate,
    required this.subject,
    this.notes,
    this.status,
    this.contactFirstName,
    this.contactLastName,
    this.applicationPosition,
    this.companyName,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isCompanyOnly => contactId == null || contactId!.isEmpty;

  String get targetLabel {
    if (!isCompanyOnly) {
      final parts = [contactFirstName, contactLastName]
          .where((s) => s != null && s.trim().isNotEmpty)
          .toList();
      if (parts.isNotEmpty) return parts.join(' ');
    }
    if (companyName != null && companyName!.trim().isNotEmpty) {
      return companyName!.trim();
    }
    return 'Entreprise (sans contact)';
  }

  factory Call.fromJson(Map<String, dynamic> json) {
    final dateStr = json['callDate'] ?? json['scheduledDate'];
    final contact = json['contact'];
    Map<String, dynamic>? contactMap;
    if (contact is Map) contactMap = Map<String, dynamic>.from(contact);
    final linked = parseLinkedAppCompany(json);

    return Call(
      id: json['id'] ?? '',
      applicationId: json['applicationId'] ?? '',
      contactId: json['contactId']?.toString(),
      companyId: json['companyId']?.toString(),
      callDate: dateStr != null ? DateTime.parse(dateStr.toString()) : DateTime.now(),
      subject: json['subject'] ?? '',
      notes: json['notes'],
      status: json['status']?.toString(),
      contactFirstName:
          contactMap?['firstName']?.toString() ?? json['contactFirstName']?.toString(),
      contactLastName:
          contactMap?['lastName']?.toString() ?? json['contactLastName']?.toString(),
      applicationPosition: linked.position,
      companyName: linked.companyName,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'].toString())
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'].toString())
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'applicationId': applicationId,
        if (contactId != null) 'contactId': contactId,
        if (companyId != null) 'companyId': companyId,
        'callDate': callDate.toIso8601String(),
        'subject': subject,
        if (notes != null) 'notes': notes,
        if (status != null) 'status': status,
        if (contactFirstName != null) 'contactFirstName': contactFirstName,
        if (contactLastName != null) 'contactLastName': contactLastName,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };
}
