
class Event {
  final String id;
  final String title;
  final String description;
  final String startDate;
  final String endDate;
  final bool isAllDay;
  final String type;
  final bool isReminderActive;
  final int? reminderMinutesBefore;
  final String? color;

  const Event({
    required this.id,
    required this.title,
    this.description = '',
    required this.startDate,
    this.endDate = '',
    this.isAllDay = false,
    this.type = 'AUTRE',
    this.isReminderActive = false,
    this.reminderMinutesBefore,
    this.color,
  });

  factory Event.fromJson(Map<String, dynamic> json) {
    return Event(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      startDate: json['startDate'] ?? '',
      endDate: json['endDate'] ?? '',
      isAllDay: json['isAllDay'] ?? false,
      type: json['type'] ?? 'AUTRE',
      isReminderActive: json['isReminderActive'] ?? false,
      reminderMinutesBefore: json['reminderMinutesBefore'],
      color: json['color'],
    );
  }
}