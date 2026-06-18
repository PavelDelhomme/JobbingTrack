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
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isCompanyOnly => contactId == null || contactId!.isEmpty;

  String get targetLabel {
    if (!isCompanyOnly) {
      final parts = [contactFirstName, contactLastName].where((s) => s != null && s.trim().isNotEmpty).toList();
      if (parts.isNotEmpty) return parts.join(' ');
    }
    return 'Entreprise (sans contact)';
  }

  factory Call.fromJson(Map<String, dynamic> json) {
    final dateStr = json['callDate'] ?? json['scheduledDate'];
    final contact = json['contact'];
    Map<String, dynamic>? contactMap;
    if (contact is Map) contactMap = Map<String, dynamic>.from(contact);

    return Call(
      id: json['id'] ?? '',
      applicationId: json['applicationId'] ?? '',
      contactId: json['contactId']?.toString(),
      companyId: json['companyId']?.toString(),
      callDate: dateStr != null ? DateTime.parse(dateStr.toString()) : DateTime.now(),
      subject: json['subject'] ?? '',
      notes: json['notes'],
      status: json['status']?.toString(),
      contactFirstName: contactMap?['firstName']?.toString() ?? json['contactFirstName']?.toString(),
      contactLastName: contactMap?['lastName']?.toString() ?? json['contactLastName']?.toString(),
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'].toString()) : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt'].toString()) : DateTime.now(),
    );
  }
}
