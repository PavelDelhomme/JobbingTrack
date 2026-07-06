import 'package:package_info_plus/package_info_plus.dart';

/// Version lue depuis [PackageInfo] (alignée sur `mobile/pubspec.yaml`).
///
/// Format technique Flutter : `semver+build` (ex. `1.0.0+5`).
/// Politique semver vs build : `docs/mobile/VERSIONNEMENT.md`.
class AppVersionDetails {
  const AppVersionDetails({
    required this.semver,
    required this.buildNumber,
  });

  /// Version semver affichée store / utilisateur (ex. `1.0.0`, `1.1.0`, `2.0.0`).
  final String semver;

  /// Numéro de build Android monotone (ex. `5`).
  final String buildNumber;

  /// Format technique OTA : `1.0.0+5`.
  String get technical => '$semver+$buildNumber';

  /// Une ligne lisible : `1.0.0 (build 5)`.
  String get displayLabel => '$semver (build $buildNumber)';

  /// Ligne courte drawer : version seule.
  String get displayVersionLine => 'Version $semver';

  /// Ligne courte drawer : build seul.
  String get displayBuildLine => 'Build $buildNumber';

  factory AppVersionDetails.fromPackageInfo(PackageInfo info) {
    return AppVersionDetails(
      semver: info.version,
      buildNumber: info.buildNumber,
    );
  }

  factory AppVersionDetails.fallback() {
    return const AppVersionDetails(semver: '1.0.0', buildNumber: '1');
  }
}

/// Version applicative (pubspec / build natif).
class AppVersionInfo {
  AppVersionInfo._();

  static AppVersionDetails? _cachedDetails;

  static Future<AppVersionDetails> getDetails() async {
    if (_cachedDetails != null) return _cachedDetails!;
    try {
      final info = await PackageInfo.fromPlatform();
      _cachedDetails = AppVersionDetails.fromPackageInfo(info);
    } catch (_) {
      _cachedDetails = AppVersionDetails.fallback();
    }
    return _cachedDetails!;
  }

  /// Chaîne technique `semver+build` (OTA, télémétrie).
  static Future<String> get() async {
    final details = await getDetails();
    return details.technical;
  }
}
