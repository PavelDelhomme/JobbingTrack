import 'package:jobbingtrack_flutter/datas/models/company.dart';

class Interview {
  final String id;
  final String title;
  final String status;
  final String scheduledAt;
  final String location;
  final String notes;
  final Company? company;

  const Interview({
    required this.id,
    required this.title,
    this.status = 'SCHEDULED',
    this.scheduledAt = '',
    this.location = '',
    this.notes = '',
    this.company,
  });

  factory Interview.fromJson(Map<String, dynamic> json) {
    return Interview(
      id: json['id'] ?? '',
      title: json['title'] ?? json['type'] ?? 'Entretien',
      status: json['status'] ?? 'SCHEDULED',
      scheduledAt: json['scheduledAt']?.toString() ?? '',
      location: json['location'] ?? '',
      notes: json['notes'] ?? '',
      company: json['company'] != null ? Company.fromJson(json['company']) : null,
    );
  }
}
