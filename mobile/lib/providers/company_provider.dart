import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';

class CompanyProvider with ChangeNotifier {
  List<Company> _companies = [];
  bool _isLoading = false;

  List<Company> get companies => _companies;
  bool get isLoading => _isLoading;

  void _notifySafely() {
    final phase = SchedulerBinding.instance.schedulerPhase;
    if (phase == SchedulerPhase.idle ||
        phase == SchedulerPhase.postFrameCallbacks) {
      notifyListeners();
      return;
    }
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (hasListeners) notifyListeners();
    });
  }

  Future<void> loadCompanies({String? token}) async {
    _isLoading = true;
    _notifySafely();
    try {
      _companies = await ApiService.getCompanies(token: token);
      _isLoading = false;
      _notifySafely();
    } catch (e) {
      _isLoading = false;
      _notifySafely();
      rethrow;
    }
  }

  Future<Company> createCompany({
    required String name,
    String? website,
    String? industry,
    String? location,
    String? description,
    String companyType = 'EMPLOYER',
    String? token,
  }) async {
    final created = await ApiService.createCompany(
      name: name,
      website: website,
      industry: industry,
      location: location,
      description: description,
      companyType: companyType,
      token: token,
    );
    _companies.insert(0, created);
    notifyListeners();
    return created;
  }
}
