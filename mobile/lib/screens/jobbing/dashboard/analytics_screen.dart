import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';
import 'package:jobbingtrack_mobile/widgets/back_to_home_scope.dart';

class AnalyticsScreen extends StatelessWidget {
  const AnalyticsScreen({super.key});

  static void _goToHome(BuildContext context) {
    Navigator.of(context).popUntil((Route<dynamic> route) =>
        route.settings.name == '/home' || route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    return BackToHomeScope(
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => _goToHome(context),
          ),
          title: const Text('Analytics'),
          centerTitle: true,
          actions: [
            MobileNotificationCenter(),
          ],
        ),
        body: const SafeArea(
          child: Center(
            child: Text('Tableau de bord analytique'),
          ),
        ),
      ),
    );
  }
}
