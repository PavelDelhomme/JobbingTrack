import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';

class FollowUpProvider with ChangeNotifier {
  List<FollowUp> _followUps = [];
  bool _isLoading = false;

  List<FollowUp> get followUps => _followUps;
  bool get isLoading => _isLoading;

  List<FollowUp> get pendingFollowUps => 
      _followUps.where((f) => f.status == 'PENDING').toList();
  
  List<FollowUp> get completedFollowUps => 
      _followUps.where((f) => f.status == 'COMPLETED').toList();

  Future<void> loadFollowUps() async {
    _isLoading = true;
    notifyListeners();

    try {
      // Simulation de chargement de données
      await Future.delayed(const Duration(seconds: 1));
      
      // TODO: Remplacer par un vrai appel API
      _followUps = [
        FollowUp(
          id: '1',
          applicationId: 'app1',
          scheduledDate: DateTime.now().add(const Duration(days: 2)),
          type: 'EMAIL',
          status: 'PENDING',
          notes: 'Relance pour savoir où en est ma candidature',
          createdAt: DateTime.now().subtract(const Duration(days: 5)),
          updatedAt: DateTime.now().subtract(const Duration(days: 5)),
        ),
        FollowUp(
          id: '2',
          applicationId: 'app2',
          scheduledDate: DateTime.now().subtract(const Duration(days: 1)),
          type: 'PHONE',
          status: 'COMPLETED',
          notes: 'Appel pour confirmation entretien',
          response: 'Entretien confirmé pour le 15/12',
          completedAt: DateTime.now().subtract(const Duration(days: 1)),
          createdAt: DateTime.now().subtract(const Duration(days: 7)),
          updatedAt: DateTime.now().subtract(const Duration(days: 1)),
        ),
      ];

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> addFollowUp(FollowUp followUp) async {
    _followUps.add(followUp);
    notifyListeners();
  }

  Future<void> updateFollowUp(String id, FollowUp followUp) async {
    final index = _followUps.indexWhere((f) => f.id == id);
    if (index != -1) {
      _followUps[index] = followUp;
      notifyListeners();
    }
  }

  Future<void> markAsCompleted(String id, String response) async {
    final index = _followUps.indexWhere((f) => f.id == id);
    if (index != -1) {
      _followUps[index] = FollowUp(
        id: _followUps[index].id,
        applicationId: _followUps[index].applicationId,
        scheduledDate: _followUps[index].scheduledDate,
        type: _followUps[index].type,
        status: 'COMPLETED',
        notes: _followUps[index].notes,
        response: response,
        completedAt: DateTime.now(),
        createdAt: _followUps[index].createdAt,
        updatedAt: DateTime.now(),
      );
      notifyListeners();
    }
  }

  Future<void> deleteFollowUp(String id) async {
    _followUps.removeWhere((f) => f.id == id);
    notifyListeners();
  }
}

