import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/applications/applications_screen.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/auth/login_screen.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/companies/companies_screen.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/contacts/contacts_screen.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/dashboard/home_screen.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/interviews/interviews_screen.dart';
import 'package:jobbingtrack_flutter/screens/jobbing/users/profile_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(const JobbingTrackApp());
}

class JobbingTrackApp extends StatelessWidget {
  const JobbingTrackApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'JobbingTrack',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const LoginScreen(),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/home': (context) => const HomeScreen(),
        '/applications': (context) => const ApplicationsScreen(),
        '/companies': (context) => const CompaniesScreen(),
        '/contacts': (context) => const ContactsScreen(),
        '/interviews': (context) => const InterviewsScreen(),
        '/profile': (context) => const ProfileScreen(),
      },
    );
  }
}

// Types et modèles
class User {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;

  const User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      role: json['role'] ?? '',
    );
  }
}

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
  final List<Contact> contacts; // NOUVEAU - Contacts liés à la candidature
  final List<ApplicationStatusHistory> statusHistory; // NOUVEAU - Historique des statuts

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
      status: json['status'] ?? '',
      description: json['description'] ?? '',
      location: json['location'] ?? '',
      type: json['type'] ?? 'FULL_TIME',
      salary: json['salary'] ?? '',
      applicationDate: json['applicationDate'] ?? '',
      jobUrl: json['jobUrl'] ?? '',
      notes: json['notes'] ?? '',
      isArchived: json['isArchived'] ?? false,
      contacts: json['contactApplications'] != null
          ? (json['contactApplications'] as List)
              .map((contactJson) => Contact.fromJson(contactJson['contact'] ?? {}))
              .toList()
          : [],
      statusHistory: json['statusHistory'] != null
          ? (json['statusHistory'] as List)
              .map((historyJson) => ApplicationStatusHistory.fromJson(historyJson))
              .toList()
          : [],
    );
  }
}

class Company {
  final String id;
  final String name;
  final String description;
  final String website;
  final String industry;
  final String size;
  final String location;

  const Company({
    required this.id,
    required this.name,
    this.description = '',
    this.website = '',
    this.industry = '',
    this.size = '',
    this.location = '',
  });

  factory Company.fromJson(Map<String, dynamic> json) {
    return Company(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      website: json['website'] ?? '',
      industry: json['industry'] ?? '',
      size: json['size'] ?? '',
      location: json['location'] ?? '',
    );
  }
}

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

  factory Contact.fromJson(Map<String, dynamic> json) {
    return Contact(
      id: json['id'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      position: json['position'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      company: json['company'] != null ? Company.fromJson(json['company']) : null,
    );
  }
}

class ApplicationStatusHistory {
  final String id;
  final String previousStatus;
  final String newStatus;
  final String comment;
  final String changedAt;
  final User? user;

  const ApplicationStatusHistory({
    required this.id,
    required this.previousStatus,
    required this.newStatus,
    this.comment = '',
    required this.changedAt,
    this.user,
  });

  factory ApplicationStatusHistory.fromJson(Map<String, dynamic> json) {
    return ApplicationStatusHistory(
      id: json['id'] ?? '',
      previousStatus: json['previousStatus'] ?? '',
      newStatus: json['newStatus'] ?? '',
      comment: json['comment'] ?? '',
      changedAt: json['changedAt'] ?? '',
      user: json['user'] != null ? User.fromJson(json['user']) : null,
    );
  }
}

class Event {
  final String id;
  final String title;
  final String description;
  final String startDate;
  final String endDate;
  final bool isAllDay;
  final String type;
  final bool isReminderActive;
  final int? reminderMinutesBefore;
  final String? color;

  const Event({
    required this.id,
    required this.title,
    this.description = '',
    required this.startDate,
    this.endDate = '',
    this.isAllDay = false,
    this.type = 'AUTRE',
    this.isReminderActive = false,
    this.reminderMinutesBefore,
    this.color,
  });

  factory Event.fromJson(Map<String, dynamic> json) {
    return Event(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      startDate: json['startDate'] ?? '',
      endDate: json['endDate'] ?? '',
      isAllDay: json['isAllDay'] ?? false,
      type: json['type'] ?? 'AUTRE',
      isReminderActive: json['isReminderActive'] ?? false,
      reminderMinutesBefore: json['reminderMinutesBefore'],
      color: json['color'],
    );
  }
}

class Notification {
  final String id;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final String createdAt;

  const Notification({
    required this.id,
    required this.title,
    required this.message,
    this.type = 'IN_APP',
    this.isRead = false,
    required this.createdAt,
  });

  factory Notification.fromJson(Map<String, dynamic> json) {
    return Notification(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      type: json['type'] ?? 'IN_APP',
      isRead: json['isRead'] ?? false,
      createdAt: json['createdAt'] ?? '',
    );
  }
}
