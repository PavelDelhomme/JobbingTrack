import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/models/app_notification.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/in_app_notification_types.dart';
import 'package:jobbingtrack_mobile/utils/notification_load_errors.dart';

class NotificationProvider with ChangeNotifier {
  List<AppNotification> _notifications = [];
  bool _isLoading = false;
  String? _lastError;

  List<AppNotification> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String? get lastError => _lastError;

  int get unreadCount => _notifications.where((n) => !n.read).length;

  bool _looksLikeAuthError(Object error) {
    final s = error.toString().toLowerCase();
    return s.contains('401') || s.contains('403') || s.contains('non autoris');
  }

  bool _looksLikeNetworkError(Object error) {
    if (ApiService.lastRequestWasNetworkFailure) return true;
    final s = error.toString().toLowerCase();
    return s.contains('réseau') ||
        s.contains('timeout') ||
        s.contains('socket') ||
        s.contains('failed host') ||
        s.contains('connection');
  }

  Future<List<AppNotification>> _fetchInApp(String? token) async {
    final raw = await ApiService.getNotifications(token: token, scope: 'in_app');
    return filterInAppNotifications(raw, (n) => n.type);
  }

  Future<void> loadNotifications({String? token, AuthProvider? auth}) async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();

    var activeToken = token ?? auth?.token;

    Future<void> fail(Object e) async {
      _lastError = friendlyNotificationLoadError(e, apiBaseUrl: ApiService.baseUrl);
      _isLoading = false;
      notifyListeners();
    }

    try {
      _notifications = await _fetchInApp(activeToken);
      _isLoading = false;
      notifyListeners();
      return;
    } catch (e) {
      if (auth != null && _looksLikeAuthError(e)) {
        final refreshed = await auth.trySilentTokenRefresh();
        if (refreshed) {
          activeToken = auth.token;
          try {
            _notifications = await _fetchInApp(activeToken);
            _isLoading = false;
            notifyListeners();
            return;
          } catch (retryErr) {
            await fail(retryErr);
            rethrow;
          }
        }
      }

      if (_looksLikeNetworkError(e)) {
        await ApiService.autoDetectApi();
        activeToken = auth?.token ?? activeToken;
        try {
          _notifications = await _fetchInApp(activeToken);
          _isLoading = false;
          notifyListeners();
          return;
        } catch (retryErr) {
          await fail(retryErr);
          rethrow;
        }
      }

      await fail(e);
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

  Future<void> deleteNotification(String id, {String? token}) async {
    await ApiService.deleteNotification(id, token: token);
    _notifications = _notifications.where((n) => n.id != id).toList();
    notifyListeners();
  }

  void clearUserCache() {
    _notifications = [];
    _isLoading = false;
    _lastError = null;
    notifyListeners();
  }
}
