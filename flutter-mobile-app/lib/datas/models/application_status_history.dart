import 'package:jobbingtrack_flutter/datas/models/user.dart';

class ApplicationStatusHistory {
  final String id;
  final String previousStatus;
  final String newStatus;
  final String comment;
  final String changedAt;
  final User? user;

  const ApplicationStatusHistory({
    required this.id,
    required this.previousStatus,
    required this.newStatus,
    this.comment = '',
    required this.changedAt,
    this.user,
  });

  factory ApplicationStatusHistory.fromJson(Map<String, dynamic> json) {
    return ApplicationStatusHistory(
      id: json['id'] ?? '',
      previousStatus: json['previousStatus'] ?? '',
      newStatus: json['newStatus'] ?? '',
      comment: json['comment'] ?? '',
      changedAt: json['changedAt']?.toString() ?? '',
      user: json['user'] != null ? User.fromJson(json['user']) : null,
    );
  }
}
