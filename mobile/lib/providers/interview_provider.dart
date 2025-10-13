import 'package:flutter/foundation.dart';

class InterviewProvider with ChangeNotifier {
  List<dynamic> _interviews = [];
  bool _isLoading = false;

  List<dynamic> get interviews => _interviews;
  bool get isLoading => _isLoading;

  Future<void> loadInterviews() async {
    _isLoading = true;
    notifyListeners();

    try {
      // TODO: Implement API call
      _interviews = [];
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }
}
