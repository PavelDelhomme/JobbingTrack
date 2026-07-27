import 'package:jobbingtrack_flutter/datas/models/company.dart';

class Contact {
  final String id;
  final String firstName;
  final String lastName;
  final String position;
  final String email;
  final String phone;
  final Company? company;

  const Contact({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.position = '',
    this.email = '',
    this.phone = '',
    this.company,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory Contact.fromJson(Map<String, dynamic> json) {
    return Contact(
      id: json['id'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      position: json['position'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      company:
          json['company'] != null ? Company.fromJson(json['company']) : null,
    );
  }
}
