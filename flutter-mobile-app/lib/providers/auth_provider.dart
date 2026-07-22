import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_flutter/datas/models/user.dart';
import 'package:jobbingtrack_flutter/services/api_service.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  String? _token;
  bool _isLoading = false;

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _token != null && _user != null;

  Future<void> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService.login(email, password);
      if (response['success'] == true && response['token'] != null) {
        _token = response['token'] as String;
        _user = User.fromJson(
          Map<String, dynamic>.from(response['user'] as Map),
        );
        ApiService.setAuthToken(_token);
        _isLoading = false;
        notifyListeners();
        return;
      }
      throw Exception(response['error'] ?? response['message'] ?? 'Erreur de connexion');
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> logout() async {
    _user = null;
    _token = null;
    ApiService.setAuthToken(null);
    notifyListeners();
  }
}
