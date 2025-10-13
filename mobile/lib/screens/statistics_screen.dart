import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

class StatisticsScreen extends StatelessWidget {
  const StatisticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistiques'),
        centerTitle: true,
        actions: [
          MobileNotificationCenter(),
        ],
      ),
      body: const SafeArea(
        child: Center(
          child: Text('Statistiques détaillées'),
        ),
      ),
    );
  }
}
