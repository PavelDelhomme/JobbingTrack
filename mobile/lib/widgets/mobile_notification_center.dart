import 'package:flutter/material.dart';

class MobileNotificationCenter extends StatelessWidget {
  const MobileNotificationCenter({super.key});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: () {
        // TODO: Show notifications
      },
      icon: const Icon(Icons.notifications),
      tooltip: 'Notifications',
    );
  }
}
