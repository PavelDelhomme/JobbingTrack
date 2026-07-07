/// Politique version JobbingTrack — voir docs/mobile/VERSIONNEMENT.md
class AppVersionPolicy {
  AppVersionPolicy._();

  /// Version affichée : MAJOR.MINOR.BUILD (ex. 1.0.12).
  static String formatDisplayVersion(int major, int minor, int build) {
    return '$major.$minor.$build';
  }

  /// Ancien format 1.0.0 + build 12 → 1.0.12
  static String normalizeLegacy(String semver, int build) {
    final parts = semver.split('.').map(int.tryParse).toList();
    final major = parts.isNotEmpty ? (parts[0] ?? 1) : 1;
    final minor = parts.length > 1 ? (parts[1] ?? 0) : 0;
    final patch = parts.length > 2 ? (parts[2] ?? 0) : 0;
    if (build <= 0) return semver;
    if (major == 1 && minor == 0 && patch == 0) {
      return formatDisplayVersion(major, minor, build);
    }
    return formatDisplayVersion(major, minor, build);
  }

  static bool patchMatchesBuild(String semver, String buildNumber) {
    final parts = semver.split('.');
    if (parts.length < 3) return false;
    return parts[2] == buildNumber;
  }
}
