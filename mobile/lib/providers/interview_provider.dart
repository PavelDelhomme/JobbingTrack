import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/offline_entity_cache.dart';
import 'package:jobbingtrack_mobile/services/offline_list_loader.dart';
import 'package:jobbingtrack_mobile/utils/upcoming_timeline.dart';

class InterviewProvider with ChangeNotifier {
  List<Interview> _interviews = [];
  bool _isLoading = false;
  bool _isOfflineData = false;

  List<Interview> get interviews => _interviews;
  List<Interview> get upcomingInterviews => filterUpcomingInterviews(_interviews);
  List<Interview> get pastInterviews => filterPastInterviews(_interviews);
  bool get isLoading => _isLoading;
  bool get isOfflineData => _isOfflineData;

  Future<void> loadInterviews({String? token, String? userId}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final result = await OfflineListLoader.load<Interview>(
        userId: userId,
        cacheKey: OfflineEntityKeys.interviews,
        fetch: () => ApiService.getInterviews(token: token),
        fromJson: Interview.fromJson,
        toJson: (i) => i.toJson(),
      );
      _interviews = result.items;
      _isOfflineData = result.fromCache;
    } catch (e) {
      _isOfflineData = false;
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearUserCache() {
    _interviews = [];
    _isLoading = false;
    _isOfflineData = false;
    notifyListeners();
  }
}
