import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';

enum UpcomingKind { interview, followUp }

class UpcomingTimelineItem {
  final UpcomingKind kind;
  final DateTime when;
  final String title;
  final String subtitle;
  final String? id;

  const UpcomingTimelineItem({
    required this.kind,
    required this.when,
    required this.title,
    required this.subtitle,
    this.id,
  });
}

bool isUpcomingDate(DateTime date, {DateTime? now}) {
  final ref = now ?? DateTime.now();
  return !date.isBefore(ref.subtract(const Duration(hours: 1)));
}

List<Interview> filterUpcomingInterviews(List<Interview> interviews, {DateTime? now}) {
  final list = interviews.where((i) => isUpcomingDate(i.interviewDate, now: now)).toList()
    ..sort((a, b) => a.interviewDate.compareTo(b.interviewDate));
  return list;
}

List<Interview> filterPastInterviews(List<Interview> interviews, {DateTime? now}) {
  final list = interviews.where((i) => !isUpcomingDate(i.interviewDate, now: now)).toList()
    ..sort((a, b) => b.interviewDate.compareTo(a.interviewDate));
  return list;
}

List<FollowUp> filterUpcomingFollowUps(List<FollowUp> followUps, {DateTime? now}) {
  final list = followUps.where((f) {
    if (f.status == 'COMPLETED' || f.status == 'CANCELLED') return false;
    return isUpcomingDate(f.scheduledDate, now: now);
  }).toList()
    ..sort((a, b) => a.scheduledDate.compareTo(b.scheduledDate));
  return list;
}

List<FollowUp> filterPastFollowUps(List<FollowUp> followUps, {DateTime? now}) {
  final list = followUps.where((f) {
    if (f.status == 'COMPLETED') return true;
    if (f.status == 'CANCELLED') return true;
    return !isUpcomingDate(f.scheduledDate, now: now);
  }).toList()
    ..sort((a, b) => b.scheduledDate.compareTo(a.scheduledDate));
  return list;
}

List<UpcomingTimelineItem> buildUpcomingTimeline({
  required List<Interview> interviews,
  required List<FollowUp> followUps,
  int limit = 8,
  DateTime? now,
}) {
  final items = <UpcomingTimelineItem>[
    ...filterUpcomingInterviews(interviews, now: now).map(
      (i) => UpcomingTimelineItem(
        kind: UpcomingKind.interview,
        when: i.interviewDate,
        title: 'Entretien',
        subtitle: i.location ?? i.notes ?? 'Candidature ${i.applicationId}',
        id: i.id,
      ),
    ),
    ...filterUpcomingFollowUps(followUps, now: now).map(
      (f) => UpcomingTimelineItem(
        kind: UpcomingKind.followUp,
        when: f.scheduledDate,
        title: 'Relance',
        subtitle: f.notes ?? f.type,
        id: f.id,
      ),
    ),
  ];
  items.sort((a, b) => a.when.compareTo(b.when));
  if (items.length > limit) return items.sublist(0, limit);
  return items;
}
