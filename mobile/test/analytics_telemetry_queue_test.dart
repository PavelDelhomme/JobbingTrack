import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/services/analytics_telemetry_queue.dart';

void main() {
  group('AnalyticsTelemetryQueue helpers', () {
    test('isNetworkError détecte SocketException et TimeoutException', () {
      expect(AnalyticsTelemetryQueue.isNetworkError(const SocketException('offline')), isTrue);
      expect(AnalyticsTelemetryQueue.isNetworkError(TimeoutException('slow')), isTrue);
      expect(AnalyticsTelemetryQueue.isNetworkError(Exception('logic')), isFalse);
    });

    test('isRetriableHttpStatus inclut 0 et 5xx', () {
      expect(AnalyticsTelemetryQueue.isRetriableHttpStatus(0), isTrue);
      expect(AnalyticsTelemetryQueue.isRetriableHttpStatus(503), isTrue);
      expect(AnalyticsTelemetryQueue.isRetriableHttpStatus(404), isFalse);
    });

    test('telemetryKindPriority ordonne session avant events', () {
      expect(
        telemetryKindPriority('session'),
        lessThan(telemetryKindPriority('event')),
      );
      expect(
        telemetryKindPriority('device'),
        lessThan(telemetryKindPriority('performance')),
      );
    });
  });
}
