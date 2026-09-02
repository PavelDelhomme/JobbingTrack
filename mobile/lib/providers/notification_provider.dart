import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/models/app_notification.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/offline_business_sync_queue.dart';
import 'package:jobbingtrack_mobile/services/offline_entity_cache.dart';
import 'package:jobbingtrack_mobile/services/offline_list_loader.dart';
import 'package:jobbingtrack_mobile/utils/in_app_notification_types.dart';
import 'package:jobbingtrack_mobile/utils/notification_load_errors.dart';

class NotificationProvider with ChangeNotifier {
  List<AppNotification> _notifications = [];
  bool _isLoading = false;
  bool _isOfflineData = false;
  String? _lastError;

  List<AppNotification> get notifications => _notifications;
  bool get isLoading => _isLoading;
  bool get isOfflineData => _isOfflineData;
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
    final userId = auth?.user?.id;

    Future<void> fail(Object e) async {
      _lastError = friendlyNotificationLoadError(e, apiBaseUrl: ApiService.baseUrl);
      _isLoading = false;
      notifyListeners();
    }

    Future<bool> tryOfflineCache() async {
      if (userId == null || userId.isEmpty) return false;
      final cached = await OfflineEntityCache.instance.loadList(
        userId,
        OfflineEntityKeys.notifications,
      );
      if (cached == null || cached.isEmpty) return false;
      final parsed = cached.map(AppNotification.fromJson).toList();
      _notifications = filterInAppNotifications(parsed, (n) => n.type);
      _isOfflineData = true;
      _isLoading = false;
      notifyListeners();
      return true;
    }

    try {
      final result = await OfflineListLoader.load<AppNotification>(
        userId: userId,
        cacheKey: OfflineEntityKeys.notifications,
        fetch: () => _fetchInApp(activeToken),
        fromJson: AppNotification.fromJson,
        toJson: (n) => n.toJson(),
      );
      _notifications = result.items;
      _isOfflineData = result.fromCache;
      _isLoading = false;
      notifyListeners();
      return;
    } catch (e) {
      if (auth != null && _looksLikeAuthError(e)) {
        final refreshed = await auth.trySilentTokenRefresh();
        if (refreshed) {
          activeToken = auth.token;
          try {
            final result = await OfflineListLoader.load<AppNotification>(
              userId: userId,
              cacheKey: OfflineEntityKeys.notifications,
              fetch: () => _fetchInApp(activeToken),
              fromJson: AppNotification.fromJson,
              toJson: (n) => n.toJson(),
            );
            _notifications = result.items;
            _isOfflineData = result.fromCache;
            _isLoading = false;
            notifyListeners();
            return;
          } catch (retryErr) {
            if (await tryOfflineCache()) return;
            await fail(retryErr);
            rethrow;
          }
        }
      }

      if (_looksLikeNetworkError(e)) {
        if (await tryOfflineCache()) return;
        await ApiService.autoDetectApi();
        activeToken = auth?.token ?? activeToken;
        try {
          final result = await OfflineListLoader.load<AppNotification>(
            userId: userId,
            cacheKey: OfflineEntityKeys.notifications,
            fetch: () => _fetchInApp(activeToken),
            fromJson: AppNotification.fromJson,
            toJson: (n) => n.toJson(),
          );
          _notifications = result.items;
          _isOfflineData = result.fromCache;
          _isLoading = false;
          notifyListeners();
          return;
        } catch (retryErr) {
          if (await tryOfflineCache()) return;
          await fail(retryErr);
          rethrow;
        }
      }

      if (await tryOfflineCache()) return;
      await fail(e);
      rethrow;
    }
  }

  void _applyReadLocal(String id) {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index == -1) return;
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

  void _applyAllReadLocal() {
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

  Future<void> markAsRead(String id, {String? token}) async {
    try {
      await ApiService.markNotificationRead(id, token: token);
    } on OfflineMutationQueued {
      // déjà en file — UI locale ci-dessous
    }
    _applyReadLocal(id);
  }

  Future<void> markAllAsRead({String? token}) async {
    try {
      await ApiService.markAllNotificationsRead(token: token);
    } on OfflineMutationQueued {
      // déjà en file — UI locale ci-dessous
    }
    _applyAllReadLocal();
  }

  Future<void> deleteNotification(String id, {String? token}) async {
    try {
      await ApiService.deleteNotification(id, token: token);
    } on OfflineMutationQueued {
      // déjà en file — UI locale ci-dessous
    }
    _notifications = _notifications.where((n) => n.id != id).toList();
    notifyListeners();
  }

  void clearUserCache() {
    _notifications = [];
    _isLoading = false;
    _isOfflineData = false;
    _lastError = null;
    notifyListeners();
  }
}
