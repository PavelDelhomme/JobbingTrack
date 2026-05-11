import 'user.dart';
import 'company.dart';

class Application {
  final String id;
  final String position;
  final String description;
  final Company company;
  final String status;
  final String priority;
  final DateTime appliedDate;
  final DateTime? interviewDate;
  final String location;
  final String salary;
  final String notes;
  final List<String> tags;
  final User createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Application({
    required this.id,
    required this.position,
    required this.description,
    required this.company,
    required this.status,
    required this.priority,
    required this.appliedDate,
    this.interviewDate,
    required this.location,
    required this.salary,
    required this.notes,
    required this.tags,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Application.fromJson(Map<String, dynamic> json) {
    final status = json['status'];
    final statusCode = status is Map ? (status['code'] ?? status['name'] ?? '') : (status?.toString() ?? '');
    final appliedDate = json['applicationDate'] ?? json['appliedDate'];
    return Application(
      id: json['id'] ?? '',
      position: json['position'] ?? '',
      description: json['description'] ?? '',
      company: Company.fromJson(json['company'] ?? {}),
      status: statusCode.isNotEmpty ? statusCode : (json['status']?.toString() ?? ''),
      priority: json['priority'] ?? 'MEDIUM',
      appliedDate: appliedDate != null ? DateTime.tryParse(appliedDate.toString()) ?? DateTime.now() : DateTime.now(),
      interviewDate: json['interviewDate'] != null ? DateTime.tryParse(json['interviewDate'].toString()) : null,
      location: json['location'] ?? '',
      salary: json['salary']?.toString() ?? '',
      notes: json['notes'] ?? '',
      tags: List<String>.from(json['tags'] ?? []),
      createdBy: json['createdBy'] != null ? User.fromJson(json['createdBy'] as Map<String, dynamic>) : User.fromJson({}),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'position': position,
      'description': description,
      'company': company.toJson(),
      'status': status,
      'priority': priority,
      'appliedDate': appliedDate.toIso8601String(),
      'interviewDate': interviewDate?.toIso8601String(),
      'location': location,
      'salary': salary,
      'notes': notes,
      'tags': tags,
      'createdBy': createdBy.toJson(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
