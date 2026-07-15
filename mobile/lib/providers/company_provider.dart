import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/offline_entity_cache.dart';
import 'package:jobbingtrack_mobile/services/offline_list_loader.dart';

class CompanyProvider with ChangeNotifier {
  List<Company> _companies = [];
  bool _isLoading = false;
  bool _isOfflineData = false;

  List<Company> get companies => _companies;
  bool get isLoading => _isLoading;
  bool get isOfflineData => _isOfflineData;

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

  Future<void> loadCompanies({String? token, String? userId}) async {
    _isLoading = true;
    _notifySafely();
    try {
      final result = await OfflineListLoader.load<Company>(
        userId: userId,
        cacheKey: OfflineEntityKeys.companies,
        fetch: () => ApiService.getCompanies(token: token),
        fromJson: Company.fromJson,
        toJson: (c) => c.toJson(),
      );
      _companies = result.items;
      _isOfflineData = result.fromCache;
      _isLoading = false;
      _notifySafely();
    } catch (e) {
      _isLoading = false;
      _isOfflineData = false;
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

  void clearUserCache() {
    _companies = [];
    _isLoading = false;
    _isOfflineData = false;
    _notifySafely();
  }
}
