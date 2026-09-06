import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/services/mobile_update_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// État global OTA : MAJ dispo, snooze, dernière vérif — bandeau / Paramètres / popup (comme GasoilTracking).
class MobileUpdateController extends ChangeNotifier {
  MobileUpdateController._();
  static final MobileUpdateController instance = MobileUpdateController._();

  static const _snoozeKey = 'jt_ota_snooze_v1';
  static const snoozeDuration = Duration(hours: 2);

  MobileReleaseInfo? pendingRelease;
  String? currentVersion;
  bool forceUpdate = false;
  int buildsBehind = 0;
  String? lastError;
  DateTime? lastCheckedAt;
  bool checking = false;
  double? downloadProgress;

  bool get hasUpdate => pendingRelease != null;

  String get channelLabel => MobileUpdateService.releaseChannel;

  Future<({MobileReleaseInfo release, String current, bool optional, bool blocked, int buildsBehind})?> refresh({
    bool silent = true,
  }) async {
    if (checking) return null;
    checking = true;
    lastError = null;
    notifyListeners();
    try {
      final result = await MobileUpdateService.evaluateUpdate()
          .timeout(const Duration(seconds: 12));
      lastCheckedAt = DateTime.now();
      if (result == null) {
        pendingRelease = null;
        currentVersion = await MobileUpdateService.readCurrentVersion();
        forceUpdate = false;
        buildsBehind = 0;
        await _clearSnooze();
      } else {
        pendingRelease = result.release;
        currentVersion = result.current;
        forceUpdate = result.blocked || result.release.forceUpdate;
        buildsBehind = result.buildsBehind;
      }
      return result;
    } catch (e, st) {
      lastError = e.toString();
      debugPrint('[OTA] refresh failed: $e\n$st');
      if (!silent) rethrow;
      return null;
    } finally {
      checking = false;
      notifyListeners();
    }
  }

  /// Afficher la popup (force toujours ; optionnelle sauf snooze actif).
  Future<bool> shouldPrompt({bool ignoreSnooze = false}) async {
    final release = pendingRelease;
    if (release == null) return false;
    if (forceUpdate) return true;
    if (ignoreSnooze) return true;
    final snooze = await _readSnooze();
    if (snooze == null) return true;
    final versionKey = '${release.version}+${release.buildNumber}';
    if (snooze['version'] == versionKey) {
      final until = snooze['until'];
      if (until is int && until > DateTime.now().millisecondsSinceEpoch) {
        return false;
      }
    }
    return true;
  }

  Future<void> snoozeLater() async {
    final release = pendingRelease;
    if (release == null) return;
    final prefs = await SharedPreferences.getInstance();
    final until = DateTime.now().add(snoozeDuration).millisecondsSinceEpoch;
    await prefs.setString(
      _snoozeKey,
      '${release.version}+${release.buildNumber}|$until',
    );
  }

  Future<Map<String, dynamic>?> _readSnooze() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_snoozeKey);
    if (raw == null || raw.isEmpty) return null;
    final parts = raw.split('|');
    if (parts.length != 2) return null;
    return {
      'version': parts[0],
      'until': int.tryParse(parts[1]) ?? 0,
    };
  }

  Future<void> _clearSnooze() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_snoozeKey);
  }

  void clearPending() {
    pendingRelease = null;
    forceUpdate = false;
    notifyListeners();
  }

  void setDownloadProgress(double? value) {
    downloadProgress = value;
    notifyListeners();
  }
}
