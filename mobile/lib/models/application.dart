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
    return Application(
      id: json['id'] ?? '',
      position: json['position'] ?? '',
      description: json['description'] ?? '',
      company: Company.fromJson(json['company'] ?? {}),
      status: json['status'] ?? '',
      priority: json['priority'] ?? 'MEDIUM',
      appliedDate: DateTime.parse(json['appliedDate'] ?? DateTime.now().toIso8601String()),
      interviewDate: json['interviewDate'] != null ? DateTime.parse(json['interviewDate']) : null,
      location: json['location'] ?? '',
      salary: json['salary'] ?? '',
      notes: json['notes'] ?? '',
      tags: List<String>.from(json['tags'] ?? []),
      createdBy: User.fromJson(json['createdBy'] ?? {}),
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
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
