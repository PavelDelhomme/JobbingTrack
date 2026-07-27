import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_flutter/datas/models/application.dart';
import 'package:jobbingtrack_flutter/services/api_service.dart';

class ApplicationProvider with ChangeNotifier {
  List<Application> _applications = [];
  bool _isLoading = false;
  String? _lastError;

  List<Application> get applications => _applications;
  bool get isLoading => _isLoading;
  String? get lastError => _lastError;

  Future<void> loadApplications() async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();

    try {
      _applications = await ApiService.getApplications();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _applications = [];
      _lastError = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }
}
