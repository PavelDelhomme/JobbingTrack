import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/mobile_update_service.dart';

void main() {
  tearDown(() {
    ApiService.baseUrl = 'http://127.0.0.1:5002';
  });

  test('resolveAndroidDownloadUrl résout un chemin relatif', () {
    ApiService.baseUrl = 'http://127.0.0.1:5002';
    const relative = '/api/v1/mobile/releases/download/smoke-test.apk';

    expect(
      MobileUpdateService.resolveAndroidDownloadUrl(relative),
      'http://127.0.0.1:5002/api/v1/mobile/releases/download/smoke-test.apk',
    );
  });

  test('resolveAndroidDownloadUrl réécrit *.localhost vers baseUrl API', () {
    ApiService.baseUrl = 'http://127.0.0.1:5002';
    const serverUrl =
        'https://api.jobbingtrack.localhost:5443/api/v1/mobile/releases/download/smoke-test.apk';

    final resolved = MobileUpdateService.resolveAndroidDownloadUrl(serverUrl);

    expect(
      resolved,
      'http://127.0.0.1:5002/api/v1/mobile/releases/download/smoke-test.apk',
    );
  });

  test('resolveAndroidDownloadUrl conserve une URL publique réelle', () {
    ApiService.baseUrl = 'http://127.0.0.1:5002';
    const cdn = 'https://cdn.example.com/jobbingtrack-1.0.1.apk';

    expect(MobileUpdateService.resolveAndroidDownloadUrl(cdn), cdn);
  });

  test('resolveAndroidDownloadUrl réécrit 127.0.0.1 avec port HTTPS dev', () {
    ApiService.baseUrl = 'http://192.168.1.134:5002';
    const serverUrl =
        'https://127.0.0.1:5443/api/v1/mobile/releases/download/app-debug.apk';

    final resolved = MobileUpdateService.resolveAndroidDownloadUrl(serverUrl);

    expect(
      resolved,
      'http://192.168.1.134:5002/api/v1/mobile/releases/download/app-debug.apk',
    );
  });
}
