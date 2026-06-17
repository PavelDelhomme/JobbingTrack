import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';

class ApplicationProvider with ChangeNotifier {
  List<Application> _applications = [];
  bool _isLoading = false;
  String? _lastError;

  List<Application> get applications => _applications;
  bool get isLoading => _isLoading;
  String? get lastError => _lastError;

  Future<void> loadApplications({String? token}) async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();

    try {
      _applications = await ApiService.getApplications(token: token);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _lastError = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> createApplication(Application application, {String? token}) async {
    try {
      final newApplication =
          await ApiService.createApplication(application, token: token);
      _applications.add(newApplication);
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateApplication(
    String id,
    Application application, {
    String? token,
  }) async {
    try {
      final updatedApplication =
          await ApiService.updateApplication(id, application, token: token);
      final index = _applications.indexWhere((app) => app.id == id);
      if (index != -1) {
        _applications[index] = updatedApplication;
        notifyListeners();
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteApplication(String id, {String? token}) async {
    try {
      await ApiService.deleteApplication(id, token: token);
      _applications.removeWhere((app) => app.id == id);
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }
}
