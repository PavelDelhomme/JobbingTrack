import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class TestDataScreen extends StatelessWidget {
  const TestDataScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Données de test'),
        centerTitle: true,
        actions: [
          MobileNotificationCenter(),
        ],
      ),
      body: const SafeArea(
        child: Center(
          child: Text('Gestion des données de test'),
        ),
      ),
    );
  }
}
