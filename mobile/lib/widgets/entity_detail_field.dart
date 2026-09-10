import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/theme/theme_extensions.dart';

class EntityDetailField extends StatelessWidget {
  final String label;
  final String value;
  final bool multiline;

  const EntityDetailField({
    super.key,
    required this.label,
    required this.value,
    this.multiline = false,
  });

  @override
  Widget build(BuildContext context) {
    final display = value.trim().isEmpty ? '—' : value.trim();
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: context.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              display,
              style: TextStyle(
                fontSize: 15,
                color: context.textPrimary,
                height: multiline ? 1.4 : 1.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
