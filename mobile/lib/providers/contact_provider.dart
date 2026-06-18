import 'package:flutter/foundation.dart';

import 'package:jobbingtrack_mobile/services/api_service.dart';

class ContactProvider with ChangeNotifier {
  List<dynamic> _contacts = [];
  bool _isLoading = false;

  List<dynamic> get contacts => _contacts;
  bool get isLoading => _isLoading;

  Future<void> loadContacts({String? token}) async {
    _isLoading = true;
    notifyListeners();
    try {
      _contacts = await ApiService.getContacts(token: token);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  void clearUserCache() {
    _contacts = [];
    _isLoading = false;
    notifyListeners();
  }
}
