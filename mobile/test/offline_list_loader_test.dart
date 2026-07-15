import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/services/offline_entity_cache.dart';
import 'package:jobbingtrack_mobile/services/offline_list_loader.dart';

void main() {
  group('OfflineListLoader', () {
    test('isNetworkFailure délègue à AnalyticsTelemetryQueue', () {
      expect(OfflineListLoader.isNetworkFailure(const SocketException('failed')), isTrue);
    });
  });

  group('OfflineEntityKeys', () {
    test('clés métier distinctes', () {
      expect(OfflineEntityKeys.applications, isNot(OfflineEntityKeys.companies));
      expect(OfflineEntityKeys.calls, 'calls');
    });
  });
}
