import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/offline_entity_cache.dart';
import 'package:jobbingtrack_mobile/services/offline_list_loader.dart';
import 'package:jobbingtrack_mobile/utils/upcoming_timeline.dart';

class FollowUpProvider with ChangeNotifier {
  List<FollowUp> _followUps = [];
  bool _isLoading = false;
  bool _isOfflineData = false;

  List<FollowUp> get followUps => _followUps;
  bool get isLoading => _isLoading;
  bool get isOfflineData => _isOfflineData;

  List<FollowUp> get pendingFollowUps => filterUpcomingFollowUps(_followUps);

  List<FollowUp> get completedFollowUps => filterPastFollowUps(_followUps);

  Future<void> loadFollowUps({
    String? token,
    String? userId,
    String? applicationId,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      if (applicationId != null && applicationId.isNotEmpty) {
        _followUps = await ApiService.getFollowUps(
          applicationId: applicationId,
          token: token,
        );
        _isOfflineData = false;
      } else {
        final result = await OfflineListLoader.load<FollowUp>(
          userId: userId,
          cacheKey: OfflineEntityKeys.followUps,
          fetch: () => ApiService.getFollowUps(token: token),
          fromJson: FollowUp.fromJson,
          toJson: (f) => f.toJson(),
        );
        _followUps = result.items;
        _isOfflineData = result.fromCache;
      }
    } catch (e) {
      if (applicationId != null &&
          applicationId.isNotEmpty &&
          userId != null &&
          userId.isNotEmpty) {
        final cached = await OfflineEntityCache.instance.loadList(
          userId,
          OfflineEntityKeys.followUps,
        );
        if (cached != null && cached.isNotEmpty) {
          _followUps = cached
              .map(FollowUp.fromJson)
              .where((f) => f.applicationId == applicationId)
              .toList();
          _isOfflineData = true;
          return;
        }
      }
      _isOfflineData = false;
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addFollowUp(FollowUp followUp) async {
    _followUps.add(followUp);
    notifyListeners();
  }

  Future<FollowUp> createFollowUp({
    required String applicationId,
    required DateTime followUpDate,
    String? notes,
    String? token,
  }) async {
    final created = await ApiService.createFollowUp(
      applicationId: applicationId,
      followUpDate: followUpDate,
      notes: notes,
      token: token,
    );
    _followUps.insert(0, created);
    notifyListeners();
    return created;
  }

  Future<void> updateFollowUp(String id, FollowUp followUp) async {
    final index = _followUps.indexWhere((f) => f.id == id);
    if (index != -1) {
      _followUps[index] = followUp;
      notifyListeners();
    }
  }

  Future<void> markAsCompleted(String id, String response, {String? token}) async {
    final updated = await ApiService.completeFollowUp(id, response, token: token);
    final index = _followUps.indexWhere((f) => f.id == id);
    if (index != -1) {
      _followUps[index] = updated;
    } else {
      _followUps.insert(0, updated);
    }
    notifyListeners();
  }

  Future<void> deleteFollowUp(String id, {String? token}) async {
    await ApiService.deleteFollowUp(id, token: token);
    _followUps.removeWhere((f) => f.id == id);
    notifyListeners();
  }

  void clearUserCache() {
    _followUps = [];
    _isLoading = false;
    _isOfflineData = false;
    notifyListeners();
  }
}
