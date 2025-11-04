import 'package:flutter/foundation.dart';

class ContactProvider with ChangeNotifier {
  List<dynamic> _contacts = [];
  bool _isLoading = false;

  List<dynamic> get contacts => _contacts;
  bool get isLoading => _isLoading;

  Future<void> loadContacts() async {
    _isLoading = true;
    notifyListeners();

    try {
      // TODO: Implement API call
      _contacts = [];
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }
}
