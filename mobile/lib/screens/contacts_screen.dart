import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class ContactsScreen extends StatelessWidget {
  const ContactsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Contacts'),
        centerTitle: true,
        actions: [
          MobileNotificationCenter(),
        ],
      ),
      body: const SafeArea(
        child: Center(
          child: Text('Gestion des contacts'),
        ),
      ),
    );
  }
}
