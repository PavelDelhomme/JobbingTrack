import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/services/offline_business_sync_queue.dart';

void main() {
  group('OfflineBusinessSyncQueue', () {
    test('isSyncablePath couvre les entités métier CRUD', () {
      expect(OfflineBusinessSyncQueue.isSyncablePath('/api/v1/applications'), isTrue);
      expect(OfflineBusinessSyncQueue.isSyncablePath('/api/v1/applications/id-1'), isTrue);
      expect(OfflineBusinessSyncQueue.isSyncablePath('/api/v1/follow-ups'), isTrue);
      expect(OfflineBusinessSyncQueue.isSyncablePath('/api/v1/analytics/sessions'), isFalse);
    });

    test('isRetriableHttpStatus aligné télémétrie', () {
      expect(OfflineBusinessSyncQueue.isRetriableHttpStatus(0), isTrue);
      expect(OfflineBusinessSyncQueue.isRetriableHttpStatus(502), isTrue);
      expect(OfflineBusinessSyncQueue.isRetriableHttpStatus(404), isFalse);
    });
  });
}
