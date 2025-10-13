import 'package:flutter/foundation.dart';
import '../main.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  String? _token;
  bool _isLoading = false;
  User? _selectedUser;

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  User? get selectedUser => _selectedUser;

  void setSelectedUser(User? user) {
    _selectedUser = user;
    notifyListeners();
  }

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
    _selectedUser = null;
    notifyListeners();
  }
}
