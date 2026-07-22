import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/theme/app_spacing.dart';
import 'package:jobbingtrack_flutter/core/widgets/app_page_header.dart';

/// Scaffold standard : SafeArea + header + body (liste / empty / loading).
class AppPageScaffold extends StatelessWidget {
  const AppPageScaffold({
    super.key,
    required this.title,
    required this.body,
    this.subtitle,
    this.showBack = true,
    this.accentColor,
    this.trailing,
    this.floatingActionButton,
    this.bottomNavigationBar,
  });

  final String title;
  final String? subtitle;
  final Widget body;
  final bool showBack;
  final Color? accentColor;
  final Widget? trailing;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
      body: SafeArea(
        child: Column(
          children: [
            AppPageHeader(
              title: title,
              subtitle: subtitle,
              showBack: showBack,
              accentColor: accentColor ?? Theme.of(context).colorScheme.primary,
              trailing: trailing,
            ),
            const SizedBox(height: AppSpacing.xl),
            Expanded(child: body),
          ],
        ),
      ),
    );
  }
}
