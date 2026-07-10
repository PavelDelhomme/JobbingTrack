import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';

class ApplicationProvider with ChangeNotifier {
  List<Application> _applications = [];
  bool _isLoading = false;
  String? _lastError;

  List<Application> get applications => _applications;
  bool get isLoading => _isLoading;
  String? get lastError => _lastError;

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
    Future<String?> Function()? renewToken,
  }) async {
    _isLoading = true;
    _lastError = null;
    _notifySafely();

    try {
      _applications = await ApiService.getApplications(token: token);
      _isLoading = false;
      _lastError = null;
      _notifySafely();
    } catch (e) {
      final msg = e.toString().replaceAll('Exception: ', '');
      final isAuth = msg.contains('Session expirée') || msg.contains('401') || msg.contains('403');
      if (isAuth && renewToken != null) {
        final fresh = await renewToken();
        if (fresh != null && fresh.isNotEmpty) {
          try {
            _applications = await ApiService.getApplications(token: fresh);
            _isLoading = false;
            _lastError = null;
            _notifySafely();
            return;
          } catch (retryErr) {
            _lastError = retryErr.toString().replaceAll('Exception: ', '');
            _isLoading = false;
            _notifySafely();
            return;
          }
        }
      }
      _lastError = msg;
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
    _notifySafely();
  }
}
