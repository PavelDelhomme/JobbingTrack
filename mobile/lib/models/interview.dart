import 'package:jobbingtrack_mobile/utils/list_item_meta.dart';

class Interview {
  final String id;
  final String applicationId;
  final DateTime interviewDate;
  final String? location;
  final String? videoLink;
  final String? notes;
  final int? estimatedDuration;
  final String? applicationPosition;
  final String? companyName;
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
    this.applicationPosition,
    this.companyName,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Interview.fromJson(Map<String, dynamic> json) {
    final dateStr = json['interviewDate'] ?? json['scheduledAt'];
    final linked = parseLinkedAppCompany(json);
    return Interview(
      id: json['id'] ?? '',
      applicationId: json['applicationId'] ?? '',
      interviewDate: dateStr != null ? DateTime.parse(dateStr.toString()) : DateTime.now(),
      location: json['location'],
      videoLink: json['videoLink'],
      notes: json['notes'],
      estimatedDuration: json['estimatedDuration'] != null
          ? int.tryParse(json['estimatedDuration'].toString())
          : null,
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
        'interviewDate': interviewDate.toIso8601String(),
        if (location != null) 'location': location,
        if (videoLink != null) 'videoLink': videoLink,
        if (notes != null) 'notes': notes,
        if (estimatedDuration != null) 'estimatedDuration': estimatedDuration,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        if (applicationPosition != null) 'application': {'position': applicationPosition},
        if (companyName != null) 'company': {'name': companyName},
      };
}
