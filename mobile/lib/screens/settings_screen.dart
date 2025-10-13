import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Paramètres'),
        centerTitle: true,
        actions: [
          MobileNotificationCenter(),
        ],
      ),
      body: const SafeArea(
        child: Center(
          child: Text('Paramètres de l\'application'),
        ),
      ),
    );
  }
}
