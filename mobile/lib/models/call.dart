class Call {
  final String id;
  final String applicationId;
  final DateTime callDate;
  final String subject;
  final String? notes;
  final String? status;
  final DateTime createdAt;
  final DateTime updatedAt;

  Call({
    required this.id,
    required this.applicationId,
    required this.callDate,
    required this.subject,
    this.notes,
    this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Call.fromJson(Map<String, dynamic> json) {
    final dateStr = json['callDate'] ?? json['scheduledDate'];
    return Call(
      id: json['id'] ?? '',
      applicationId: json['applicationId'] ?? '',
      callDate: dateStr != null ? DateTime.parse(dateStr.toString()) : DateTime.now(),
      subject: json['subject'] ?? '',
      notes: json['notes'],
      status: json['status']?.toString(),
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'].toString()) : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt'].toString()) : DateTime.now(),
    );
  }
}
