import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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

  const Application({
    required this.id,
    required this.position,
    required this.company,
    required this.status,
  });

  factory Application.fromJson(Map<String, dynamic> json) {
    return Application(
      id: json['id'] ?? '',
      position: json['position'] ?? '',
      company: Company.fromJson(json['company'] ?? {}),
      status: json['status'] ?? '',
    );
  }
}

class Company {
  final String name;

  const Company({required this.name});

  factory Company.fromJson(Map<String, dynamic> json) {
    return Company(name: json['name'] ?? '');
  }
}
