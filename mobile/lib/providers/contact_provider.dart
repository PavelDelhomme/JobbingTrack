import 'package:flutter/foundation.dart';

import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/offline_entity_cache.dart';
import 'package:jobbingtrack_mobile/services/offline_list_loader.dart';

class ContactProvider with ChangeNotifier {
  List<dynamic> _contacts = [];
  bool _isLoading = false;
  bool _isOfflineData = false;

  List<dynamic> get contacts => _contacts;
  bool get isLoading => _isLoading;
  bool get isOfflineData => _isOfflineData;

  Future<void> loadContacts({String? token, String? userId}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final result = await OfflineListLoader.loadMaps(
        userId: userId,
        cacheKey: OfflineEntityKeys.contacts,
        fetch: () => ApiService.getContacts(token: token),
      );
      _contacts = result.items;
      _isOfflineData = result.fromCache;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _isOfflineData = false;
      notifyListeners();
      rethrow;
    }
  }

  void clearUserCache() {
    _contacts = [];
    _isLoading = false;
    _isOfflineData = false;
    notifyListeners();
  }
}
