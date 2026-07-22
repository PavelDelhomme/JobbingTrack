import 'package:jobbingtrack_flutter/datas/models/application_status_history.dart';
import 'package:jobbingtrack_flutter/datas/models/company.dart';
import 'package:jobbingtrack_flutter/datas/models/contact.dart';

class Application {
  final String id;
  final String position;
  final Company company;
  final String status;
  final String description;
  final String location;
  final String type;
  final String salary;
  final String applicationDate;
  final String jobUrl;
  final String notes;
  final bool isArchived;
  final List<Contact> contacts;
  final List<ApplicationStatusHistory> statusHistory;

  const Application({
    required this.id,
    required this.position,
    required this.company,
    required this.status,
    this.description = '',
    this.location = '',
    this.type = 'FULL_TIME',
    this.salary = '',
    this.applicationDate = '',
    this.jobUrl = '',
    this.notes = '',
    this.isArchived = false,
    this.contacts = const [],
    this.statusHistory = const [],
  });

  factory Application.fromJson(Map<String, dynamic> json) {
    return Application(
      id: json['id'] ?? '',
      position: json['position'] ?? '',
      company: Company.fromJson(json['company'] ?? {}),
      status: json['status'] is Map
          ? (json['status']['code'] ?? json['status']['name'] ?? '')
          : (json['status'] ?? ''),
      description: json['description'] ?? '',
      location: json['location'] ?? '',
      type: json['type'] ?? json['contractType'] ?? 'FULL_TIME',
      salary: json['salary']?.toString() ?? '',
      applicationDate: json['applicationDate']?.toString() ?? '',
      jobUrl: json['jobUrl'] ?? '',
      notes: json['notes'] ?? '',
      isArchived: json['isArchived'] ?? false,
      contacts: json['contactApplications'] != null
          ? (json['contactApplications'] as List)
              .map((contactJson) =>
                  Contact.fromJson(contactJson['contact'] ?? {}))
              .toList()
          : const [],
      statusHistory: json['statusHistory'] != null
          ? (json['statusHistory'] as List)
              .map((h) => ApplicationStatusHistory.fromJson(h))
              .toList()
          : const [],
    );
  }
}
