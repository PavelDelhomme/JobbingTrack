import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';

class ApplicationProvider with ChangeNotifier {
  List<Application> _applications = [];
  bool _isLoading = false;

  List<Application> get applications => _applications;
  bool get isLoading => _isLoading;

  Future<void> loadApplications() async {
    _isLoading = true;
    notifyListeners();

    try {
      _applications = await ApiService.getApplications();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> createApplication(Application application) async {
    try {
      final newApplication = await ApiService.createApplication(application);
      _applications.add(newApplication);
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateApplication(String id, Application application) async {
    try {
      final updatedApplication = await ApiService.updateApplication(id, application);
      final index = _applications.indexWhere((app) => app.id == id);
      if (index != -1) {
        _applications[index] = updatedApplication;
        notifyListeners();
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteApplication(String id) async {
    try {
      await ApiService.deleteApplication(id);
      _applications.removeWhere((app) => app.id == id);
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }
}
