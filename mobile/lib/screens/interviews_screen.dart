import 'package:flutter/material.dart';

class InterviewsScreen extends StatelessWidget {
  const InterviewsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Entretiens'),
        centerTitle: true,
      ),
      body: const Center(
        child: Text('Écran des entretiens - À implémenter'),
      ),
    );
  }
}