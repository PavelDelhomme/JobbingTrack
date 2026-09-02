import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/services/mobile_update_service.dart';

/// État global OTA : MAJ dispo, dernière vérif, erreurs — pour badge shell / Paramètres.
class MobileUpdateController extends ChangeNotifier {
  MobileUpdateController._();
  static final MobileUpdateController instance = MobileUpdateController._();

  MobileReleaseInfo? pendingRelease;
  String? currentVersion;
  bool forceUpdate = false;
  String? lastError;
  DateTime? lastCheckedAt;
  bool checking = false;
  double? downloadProgress;

  bool get hasUpdate => pendingRelease != null;

  String get channelLabel => MobileUpdateService.releaseChannel;

  Future<({MobileReleaseInfo release, String current, bool optional, bool blocked})?> refresh({
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
      } else {
        pendingRelease = result.release;
        currentVersion = result.current;
        forceUpdate = result.blocked || result.release.forceUpdate;
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
