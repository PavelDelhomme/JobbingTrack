import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/services/telemetry_at_rest_cipher.dart';
import 'package:jobbingtrack_mobile/services/telemetry_payload_codec.dart';
import 'package:jobbingtrack_mobile/services/telemetry_sanitize.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('TelemetryPayloadCodec', () {
    test('compressJson puis decompressJson round-trip', () {
      final original = {'kind': 'event', 'body': {'page': '/home', 'n': 42}};
      final line = TelemetryPayloadCodec.compressJson(original);
      expect(line.startsWith('gz:'), isTrue);
      final decoded = TelemetryPayloadCodec.decompressJson(line);
      expect(decoded['kind'], 'event');
      expect(decoded['body']['page'], '/home');
    });
  });

  group('TelemetrySanitize', () {
    test('masque password et token', () {
      final out = TelemetrySanitize.forPersistence({
        'email': 'a@b.c',
        'password': 'secret',
        'token': 'jwt',
      });
      expect(out['password'], '[redacted]');
      expect(out['token'], '[redacted]');
    });
  });

  group('TelemetryAtRestCipher', () {
    setUp(() {
      TelemetryAtRestCipher.debugTestKey = Uint8List.fromList(List.generate(32, (i) => i + 1));
    });
    tearDown(() {
      TelemetryAtRestCipher.debugTestKey = null;
    });

    test('encrypt/decrypt round-trip', () async {
      final plain = TelemetryPayloadCodec.compressJson({'id': '1', 'kind': 'event'});
      final enc = await TelemetryAtRestCipher.encrypt(plain);
      expect(enc.startsWith(TelemetryAtRestCipher.encryptedPrefix), isTrue);
      final dec = await TelemetryAtRestCipher.decrypt(enc);
      expect(dec, plain);
    });
  });
}
