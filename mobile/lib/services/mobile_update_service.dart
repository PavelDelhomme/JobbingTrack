import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/app_version_info.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

class MobileReleaseInfo {
  const MobileReleaseInfo({
    required this.platform,
    required this.version,
    required this.buildNumber,
    required this.minVersion,
    required this.minBuild,
    required this.forceUpdate,
    required this.releaseNotes,
    this.downloadUrl,
    this.storeUrl,
  });

  final String platform;
  final String version;
  final int buildNumber;
  final String minVersion;
  final int minBuild;
  final bool forceUpdate;
  final String releaseNotes;
  final String? downloadUrl;
  final String? storeUrl;

  String get displayVersion => '$version+$buildNumber';

  factory MobileReleaseInfo.fromJson(Map<String, dynamic> json) {
    final release = json['release'] is Map<String, dynamic>
        ? json['release'] as Map<String, dynamic>
        : json;
    return MobileReleaseInfo(
      platform: release['platform']?.toString() ?? 'android',
      version: release['version']?.toString() ?? '0.0.0',
      buildNumber: int.tryParse(release['buildNumber']?.toString() ?? '') ?? 0,
      minVersion: release['minVersion']?.toString() ?? '0.0.0',
      minBuild: int.tryParse(release['minBuild']?.toString() ?? '') ?? 0,
      forceUpdate: release['forceUpdate'] == true,
      releaseNotes: release['releaseNotes']?.toString() ?? '',
      downloadUrl: release['downloadUrl']?.toString(),
      storeUrl: release['storeUrl']?.toString(),
    );
  }
}

class AppVersionParts {
  AppVersionParts({required this.parts, required this.build});

  final List<int> parts;
  final int build;

  factory AppVersionParts.parse(String raw) {
    final split = raw.split('+');
    final build = split.length > 1 ? (int.tryParse(split[1]) ?? 0) : 0;
    final versionParts = split[0]
        .split('.')
        .map((part) => int.tryParse(part) ?? 0)
        .toList(growable: false);
    return AppVersionParts(parts: versionParts, build: build);
  }

  bool isOlderThan(AppVersionParts other) {
    final maxLen = parts.length > other.parts.length ? parts.length : other.parts.length;
    for (var i = 0; i < maxLen; i++) {
      final left = i < parts.length ? parts[i] : 0;
      final right = i < other.parts.length ? other.parts[i] : 0;
      if (left != right) return left < right;
    }
    return build < other.build;
  }
}

class MobileUpdateService {
  MobileUpdateService._();

  static Future<MobileReleaseInfo?> fetchLatestRelease() async {
    final platform = Platform.isIOS ? 'ios' : 'android';
    final uri = Uri.parse(
      '${ApiService.baseUrl}/api/v1/mobile/releases/latest?platform=$platform',
    );
    final response = await http.get(uri).timeout(const Duration(seconds: 8));
    if (response.statusCode != 200) return null;
    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) return null;
    if (decoded['success'] != true) return null;
    return MobileReleaseInfo.fromJson(decoded);
  }

  static Future<({MobileReleaseInfo release, String current, bool optional, bool blocked})?> evaluateUpdate() async {
    final release = await fetchLatestRelease();
    if (release == null) return null;

    final current = await AppVersionInfo.get();
    final currentParts = AppVersionParts.parse(current);
    final latestParts = AppVersionParts.parse('${release.version}+${release.buildNumber}');
    final minParts = AppVersionParts.parse('${release.minVersion}+${release.minBuild}');

    if (currentParts.isOlderThan(minParts)) {
      return (release: release, current: current, optional: false, blocked: true);
    }
    if (currentParts.isOlderThan(latestParts)) {
      return (release: release, current: current, optional: !release.forceUpdate, blocked: release.forceUpdate);
    }
    return null;
  }

  static Future<void> downloadAndInstallAndroid(String downloadUrl) async {
    if (!Platform.isAndroid) return;

    await Permission.requestInstallPackages.request();

    final response = await http.get(Uri.parse(downloadUrl)).timeout(const Duration(minutes: 3));
    if (response.statusCode != 200) {
      throw Exception('Téléchargement APK échoué (${response.statusCode})');
    }

    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/jobbingtrack-update.apk');
    await file.writeAsBytes(response.bodyBytes, flush: true);

    final result = await OpenFilex.open(
      file.path,
      type: 'application/vnd.android.package-archive',
    );
    if (result.type != ResultType.done) {
      throw Exception(result.message ?? 'Installation APK refusée');
    }
  }
}
