import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/utils/upcoming_timeline.dart';

void main() {
  final now = DateTime(2026, 6, 17, 12);

  test('filterUpcomingInterviews exclut le passé', () {
    final list = filterUpcomingInterviews(
      [
        Interview(
          id: '1',
          applicationId: 'a',
          interviewDate: now.add(const Duration(days: 1)),
          createdAt: now,
          updatedAt: now,
        ),
        Interview(
          id: '2',
          applicationId: 'a',
          interviewDate: now.subtract(const Duration(days: 2)),
          createdAt: now,
          updatedAt: now,
        ),
      ],
      now: now,
    );
    expect(list.length, 1);
    expect(list.first.id, '1');
  });

  test('buildUpcomingTimeline trie entretiens et relances', () {
    final timeline = buildUpcomingTimeline(
      interviews: [
        Interview(
          id: 'i1',
          applicationId: 'a',
          interviewDate: now.add(const Duration(days: 2)),
          createdAt: now,
          updatedAt: now,
        ),
      ],
      followUps: [
        FollowUp(
          id: 'f1',
          applicationId: 'a',
          scheduledDate: now.add(const Duration(hours: 6)),
          type: 'EMAIL',
          status: 'PENDING',
          createdAt: now,
          updatedAt: now,
        ),
      ],
      now: now,
    );
    expect(timeline.length, 2);
    expect(timeline.first.kind, UpcomingKind.followUp);
    expect(timeline.last.kind, UpcomingKind.interview);
  });
}
