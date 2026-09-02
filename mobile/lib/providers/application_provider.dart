import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/offline_entity_cache.dart';
import 'package:jobbingtrack_mobile/services/offline_list_loader.dart';

class ApplicationProvider with ChangeNotifier {
  List<Application> _applications = [];
  bool _isLoading = false;
  String? _lastError;
  bool _isOfflineData = false;

  List<Application> get applications => _applications;
  bool get isLoading => _isLoading;
  String? get lastError => _lastError;
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

  Future<void> loadApplications({
    String? token,
    String? userId,
    Future<String?> Function()? renewToken,
  }) async {
    final showSpinner = _applications.isEmpty;
    if (showSpinner) {
      _isLoading = true;
      _lastError = null;
      _notifySafely();
    } else {
      _lastError = null;
    }
    try {
      final result = await OfflineListLoader.load<Application>(
        userId: userId,
        cacheKey: OfflineEntityKeys.applications,
        fetch: () => ApiService.getApplications(token: token),
        fromJson: Application.fromJson,
        toJson: (app) => app.toJson(),
      );
      _applications = result.items;
      _isOfflineData = result.fromCache;
      _isLoading = false;
      _lastError = result.fromCache
          ? 'Données en cache (hors ligne)'
          : null;
      _notifySafely();
    } catch (e) {
      final msg = e.toString().replaceAll('Exception: ', '');
      final isAuth = msg.contains('Session expirée') || msg.contains('401') || msg.contains('403');
      if (isAuth && renewToken != null) {
        final fresh = await renewToken();
        if (fresh != null && fresh.isNotEmpty) {
          try {
            final result = await OfflineListLoader.load<Application>(
              userId: userId,
              cacheKey: OfflineEntityKeys.applications,
              fetch: () => ApiService.getApplications(token: fresh),
              fromJson: Application.fromJson,
              toJson: (app) => app.toJson(),
            );
            _applications = result.items;
            _isOfflineData = result.fromCache;
            _isLoading = false;
            _lastError = result.fromCache ? 'Données en cache (hors ligne)' : null;
            _notifySafely();
            return;
          } catch (retryErr) {
            _lastError = retryErr.toString().replaceAll('Exception: ', '');
            _isLoading = false;
            _isOfflineData = false;
            _notifySafely();
            return;
          }
        }
      }
      _lastError = msg;
      _isOfflineData = false;
      _isLoading = false;
      _notifySafely();
    }
  }

  /// Complète le nom d'entreprise quand la liste API ne renvoie que companyId.
  void enrichCompanies(Map<String, String> companyNamesById) {
    if (companyNamesById.isEmpty) return;
    var changed = false;
    _applications = _applications.map((app) {
      if (app.company.name.isNotEmpty) return app;
      final id = app.company.id;
      if (id.isEmpty) return app;
      final name = companyNamesById[id];
      if (name == null || name.isEmpty) return app;
      changed = true;
      return Application(
        id: app.id,
        position: app.position,
        description: app.description,
        company: Company(
          id: app.company.id,
          name: name,
          website: app.company.website,
          industry: app.company.industry,
          size: app.company.size,
          location: app.company.location,
          description: app.company.description,
          logo: app.company.logo,
          companyType: app.company.companyType,
          isActive: app.company.isActive,
          isDeleted: app.company.isDeleted,
          createdBy: app.company.createdBy,
          createdAt: app.company.createdAt,
          updatedAt: app.company.updatedAt,
        ),
        status: app.status,
        priority: app.priority,
        appliedDate: app.appliedDate,
        interviewDate: app.interviewDate,
        location: app.location,
        salary: app.salary,
        notes: app.notes,
        tags: app.tags,
        createdBy: app.createdBy,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        agencyId: app.agencyId,
        agencyName: app.agencyName,
      );
    }).toList();
    if (changed) _notifySafely();
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

  Future<void> archiveApplication(String id, {String? token, String? reason}) async {
    try {
      await ApiService.archiveApplication(id, token: token, reason: reason);
      _applications.removeWhere((app) => app.id == id);
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }

  void clearUserCache() {
    _applications = [];
    _isLoading = false;
    _lastError = null;
    _isOfflineData = false;
    _notifySafely();
  }
}
