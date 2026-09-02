class AppNotification {
  final String id;
  final String title;
  final String message;
  final String type;
  final bool read;
  final DateTime? readAt;
  final String? entityType;
  final String? entityId;
  final DateTime createdAt;

  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.read,
    this.readAt,
    this.entityType,
    this.entityId,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      type: json['type']?.toString() ?? 'INFO',
      read: json['read'] == true || json['isRead'] == true,
      readAt: json['readAt'] != null ? DateTime.tryParse(json['readAt'].toString()) : null,
      entityType: json['entityType']?.toString(),
      entityId: json['entityId']?.toString(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'message': message,
        'type': type,
        'read': read,
        'isRead': read,
        if (readAt != null) 'readAt': readAt!.toIso8601String(),
        if (entityType != null) 'entityType': entityType,
        if (entityId != null) 'entityId': entityId,
        'createdAt': createdAt.toIso8601String(),
      };
}
