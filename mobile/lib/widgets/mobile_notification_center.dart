import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/app_notification.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/notification_provider.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/notification_navigation.dart';

class MobileNotificationCenter extends StatelessWidget {
  const MobileNotificationCenter({super.key});

  static Future<void> openSheet(BuildContext context) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final provider = Provider.of<NotificationProvider>(context, listen: false);
    try {
      await provider.loadNotifications(token: auth.token, auth: auth);
    } catch (_) {}
    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => const _NotificationSheet(),
    );
  }

  Future<void> _openSheet(BuildContext context) async {
    await openSheet(context);
  }

  @override
  Widget build(BuildContext context) {
    final unread = context.watch<NotificationProvider>().unreadCount;

    return IconButton(
      onPressed: () => _openSheet(context),
      tooltip: 'Notifications',
      icon: Badge(
        isLabelVisible: unread > 0,
        label: Text(unread > 9 ? '9+' : '$unread'),
        child: const Icon(Icons.notifications_outlined),
      ),
    );
  }
}

class _NotificationSheet extends StatelessWidget {
  const _NotificationSheet();

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationProvider>();
    final auth = context.watch<AuthProvider>();
    final height = MediaQuery.of(context).size.height * 0.65;

    return SafeArea(
      child: SizedBox(
        height: height,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 8, 0),
              child: Row(
                children: [
                  const Expanded(
                    child: Text('Notifications', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  ),
                  if (provider.unreadCount > 0)
                    TextButton(
                      onPressed: provider.isLoading
                          ? null
                          : () => provider.markAllAsRead(token: auth.token),
                      child: const Text('Tout marquer lu'),
                    ),
                ],
              ),
            ),
            if (provider.lastError != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      provider.lastError!,
                      style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                    ),
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        onPressed: provider.isLoading
                            ? null
                            : () => provider.loadNotifications(token: auth.token, auth: auth),
                        icon: const Icon(Icons.refresh, size: 18),
                        label: const Text('Réessayer'),
                      ),
                    ),
                  ],
                ),
              ),
            Expanded(
              child: provider.isLoading && provider.notifications.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : provider.notifications.isEmpty
                      ? Center(
                          child: Text(
                            'Aucune notification candidature',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: () => provider.loadNotifications(token: auth.token, auth: auth),
                          child: ListView.builder(
                            itemCount: provider.notifications.length,
                            itemBuilder: (_, i) => _NotificationTile(n: provider.notifications[i]),
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification n;

  const _NotificationTile({required this.n});

  Future<void> _delete(BuildContext context) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final provider = Provider.of<NotificationProvider>(context, listen: false);
    try {
      await provider.deleteNotification(n.id, token: auth.token);
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Impossible de supprimer la notification')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final provider = Provider.of<NotificationProvider>(context, listen: false);

    return Dismissible(
      key: ValueKey(n.id),
      direction: DismissDirection.endToStart,
      background: Container(
        color: Colors.red.shade400,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      onDismissed: (_) {
        provider.deleteNotification(n.id, token: auth.token).catchError((_) {});
      },
      child: Semantics(
        button: true,
        label: n.title,
        hint: n.message.isNotEmpty ? n.message : 'Ouvrir la notification',
        child: ListTile(
          leading: Icon(
            n.read ? Icons.notifications_none : Icons.notifications_active,
            color: n.read ? Colors.grey : Colors.blue.shade700,
          ),
          title: Text(n.title, style: TextStyle(fontWeight: n.read ? FontWeight.normal : FontWeight.w600)),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (n.message.isNotEmpty) Text(n.message, maxLines: 2, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 4),
              Text(
                formatUserLocalDateTime(n.createdAt.toIso8601String()),
                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
              ),
            ],
          ),
          trailing: IconButton(
            icon: const Icon(Icons.close, size: 20),
            tooltip: 'Supprimer',
            onPressed: () => _delete(context),
          ),
          onTap: () async {
            if (!n.read) {
              try {
                await provider.markAsRead(n.id, token: auth.token);
              } catch (_) {}
            }
            if (!context.mounted) return;
            Navigator.of(context).pop();
            await Future<void>.delayed(const Duration(milliseconds: 350));
            await openNotificationTarget(n, token: auth.token);
          },
        ),
      ),
    );
  }
}
