import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/upcoming_timeline.dart';

class FollowUpProvider with ChangeNotifier {
  List<FollowUp> _followUps = [];
  bool _isLoading = false;

  List<FollowUp> get followUps => _followUps;
  bool get isLoading => _isLoading;

  List<FollowUp> get pendingFollowUps => filterUpcomingFollowUps(_followUps);

  List<FollowUp> get completedFollowUps => filterPastFollowUps(_followUps);

  Future<void> loadFollowUps({String? token, String? applicationId}) async {
    _isLoading = true;
    notifyListeners();
    try {
      _followUps = await ApiService.getFollowUps(applicationId: applicationId, token: token);
    } catch (e) {
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
    if (index != -1) _followUps[index] = updated;
    else _followUps.insert(0, updated);
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
    notifyListeners();
  }
}

