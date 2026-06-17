import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/upcoming_timeline.dart';

class InterviewProvider with ChangeNotifier {
  List<Interview> _interviews = [];
  bool _isLoading = false;

  List<Interview> get interviews => _interviews;
  List<Interview> get upcomingInterviews => filterUpcomingInterviews(_interviews);
  List<Interview> get pastInterviews => filterPastInterviews(_interviews);
  bool get isLoading => _isLoading;

  Future<void> loadInterviews({String? token}) async {
    _isLoading = true;
    notifyListeners();
    try {
      _interviews = await ApiService.getInterviews(token: token);
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
