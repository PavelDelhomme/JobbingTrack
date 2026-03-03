class Interview {
  final String id;
  final String applicationId;
  final DateTime interviewDate;
  final String? location;
  final String? videoLink;
  final String? notes;
  final int? estimatedDuration;
  final DateTime createdAt;
  final DateTime updatedAt;

  Interview({
    required this.id,
    required this.applicationId,
    required this.interviewDate,
    this.location,
    this.videoLink,
    this.notes,
    this.estimatedDuration,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Interview.fromJson(Map<String, dynamic> json) {
    final dateStr = json['interviewDate'] ?? json['scheduledAt'];
    return Interview(
      id: json['id'] ?? '',
      applicationId: json['applicationId'] ?? '',
      interviewDate: dateStr != null ? DateTime.parse(dateStr.toString()) : DateTime.now(),
      location: json['location'],
      videoLink: json['videoLink'],
      notes: json['notes'],
      estimatedDuration: json['estimatedDuration'] != null ? int.tryParse(json['estimatedDuration'].toString()) : null,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'].toString()) : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt'].toString()) : DateTime.now(),
    );
  }
}
