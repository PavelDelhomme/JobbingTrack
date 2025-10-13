import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  String? _token;
  bool _isLoading = false;

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;

  Future<void> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService.login(email, password);

      if (response['success'] == true) {
        _token = response['token'];
        _user = User.fromJson(response['user']);
        _isLoading = false;
        notifyListeners();
      } else {
        throw Exception(response['message'] ?? 'Erreur de connexion');
      }
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> logout() async {
    _user = null;
    _token = null;
    notifyListeners();
  }

  bool get isAuthenticated => _token != null && _user != null;
}
