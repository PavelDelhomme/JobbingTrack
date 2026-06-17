import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/services/mobile_analytics_service.dart';

void main() {
  group('MobileAnalyticsService.sanitizeEndpoint', () {
    test('retire les query params', () {
      expect(
        MobileAnalyticsService.sanitizeEndpoint('/api/v1/applications?limit=10'),
        '/api/v1/applications',
      );
    });

    test('masque les identifiants longs', () {
      expect(
        MobileAnalyticsService.sanitizeEndpoint(
          '/api/v1/applications/clxyz1234567890abcdefghij',
        ),
        '/api/v1/applications/:id',
      );
    });
  });
}
