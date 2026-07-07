import 'package:package_info_plus/package_info_plus.dart';
import 'package:jobbingtrack_mobile/utils/app_version_policy.dart';

/// Version lue depuis [PackageInfo] (alignée sur `mobile/pubspec.yaml`).
///
/// Politique JobbingTrack : semver affichée `MAJOR.MINOR.BUILD` (ex. `1.0.12`) + build Android (+12).
/// Voir `docs/mobile/VERSIONNEMENT.md`.
class AppVersionDetails {
  const AppVersionDetails({
    required this.semver,
    required this.buildNumber,
  });

  /// Version semver affichée (ex. `1.0.12`, `1.1.20`).
  final String semver;

  /// Numéro de build Android monotone (ex. `12`) — identique au 3e segment en dev 1.0.x.
  final String buildNumber;

  /// Format technique OTA : `1.0.12+12`.
  String get technical => '$semver+$buildNumber';

  /// Une ligne lisible : `1.0.12` (build technique en secondaire si besoin).
  String get displayLabel {
    if (AppVersionPolicy.patchMatchesBuild(semver, buildNumber)) {
      return semver;
    }
    return '$semver (build $buildNumber)';
  }

  /// Ligne drawer : version produit.
  String get displayVersionLine => 'Version $semver';

  /// Ligne drawer : build (masquée si déjà dans semver).
  String? get displayBuildLine =>
      AppVersionPolicy.patchMatchesBuild(semver, buildNumber) ? null : 'Build $buildNumber';

  factory AppVersionDetails.fromPackageInfo(PackageInfo info) {
    final build = info.buildNumber;
    final semver = AppVersionPolicy.normalizeLegacy(info.version, int.tryParse(build) ?? 0);
    return AppVersionDetails(
      semver: semver,
      buildNumber: build,
    );
  }

  factory AppVersionDetails.fallback() {
    return const AppVersionDetails(semver: '1.0.1', buildNumber: '1');
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
