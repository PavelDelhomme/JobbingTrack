import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/theme/theme_extensions.dart';

class EntityLinkSectionHeader extends StatelessWidget {
  final String title;

  const EntityLinkSectionHeader(this.title, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 4),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          color: context.textPrimary,
        ),
      ),
    );
  }
}

class EntityLinkTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  const EntityLinkTile({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle = '',
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: context.cs.primary),
        title: Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(color: context.textPrimary),
        ),
        subtitle: subtitle.isNotEmpty
            ? Text(
                subtitle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: context.textSecondary),
              )
            : null,
        trailing: onTap != null
            ? Icon(Icons.chevron_right, color: context.textSecondary)
            : null,
        onTap: onTap,
      ),
    );
  }
}

class EntityLinksEmptyHint extends StatelessWidget {
  final String message;

  const EntityLinksEmptyHint(this.message, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(message, style: context.mutedStyle),
    );
  }
}
