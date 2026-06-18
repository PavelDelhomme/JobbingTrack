import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/models/app_notification.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';

class NotificationProvider with ChangeNotifier {
  List<AppNotification> _notifications = [];
  bool _isLoading = false;
  String? _lastError;

  List<AppNotification> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String? get lastError => _lastError;

  int get unreadCount => _notifications.where((n) => !n.read).length;

  Future<void> loadNotifications({String? token}) async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();
    try {
      _notifications = await ApiService.getNotifications(token: token);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _lastError = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> markAsRead(String id, {String? token}) async {
    await ApiService.markNotificationRead(id, token: token);
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index != -1) {
      final n = _notifications[index];
      _notifications[index] = AppNotification(
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        read: true,
        readAt: DateTime.now(),
        entityType: n.entityType,
        entityId: n.entityId,
        createdAt: n.createdAt,
      );
      notifyListeners();
    }
  }

  Future<void> markAllAsRead({String? token}) async {
    await ApiService.markAllNotificationsRead(token: token);
    _notifications = _notifications
        .map(
          (n) => AppNotification(
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            read: true,
            readAt: DateTime.now(),
            entityType: n.entityType,
            entityId: n.entityId,
            createdAt: n.createdAt,
          ),
        )
        .toList();
    notifyListeners();
  }

  void clearUserCache() {
    _notifications = [];
    _isLoading = false;
    _lastError = null;
    notifyListeners();
  }
}
