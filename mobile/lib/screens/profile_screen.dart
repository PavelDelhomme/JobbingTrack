import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil'),
        centerTitle: true,
        actions: [
          MobileNotificationCenter(),
        ],
      ),
      body: const SafeArea(
        child: Center(
          child: Text('Gestion du profil'),
        ),
      ),
    );
  }
}
