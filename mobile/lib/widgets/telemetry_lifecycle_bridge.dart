import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:jobbingtrack_mobile/services/analytics_telemetry_queue.dart';
import 'package:jobbingtrack_mobile/services/crash_reporter.dart';
import 'package:jobbingtrack_mobile/services/mobile_analytics_service.dart';
import 'package:jobbingtrack_mobile/services/offline_business_sync_queue.dart';
import 'package:jobbingtrack_mobile/services/network_recovery_service.dart';
import 'package:jobbingtrack_mobile/services/shell_data_refresh_service.dart';
import 'package:jobbingtrack_mobile/services/mobile_update_controller.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_update_dialog.dart';

/// Déclenche le flush télémétrie quand l'app revient au premier plan (fin d'appel, retour réseau).
class TelemetryLifecycleBridge extends StatefulWidget {
  const TelemetryLifecycleBridge({super.key, required this.child});

  final Widget child;

  @override
  State<TelemetryLifecycleBridge> createState() => _TelemetryLifecycleBridgeState();
}

class _TelemetryLifecycleBridgeState extends State<TelemetryLifecycleBridge>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    NetworkRecoveryService.startMonitoring();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    NetworkRecoveryService.stopMonitoring();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    CrashReporter.trackAppLifecycle(state.name);
    if (state == AppLifecycleState.resumed) {
      unawaited(_syncPendingTelemetry());
      unawaited(ShellDataRefreshService.refreshIfStale(force: true));
      unawaited(_checkOtaOnResume());
    }
  }

  Future<void> _checkOtaOnResume() async {
    final result = await MobileUpdateController.instance.refresh(silent: true);
    if (!mounted || result == null) return;
    // Ne pas bloquer : le bandeau shell + Paramètres suffisent ; popup seulement si force.
    if (result.blocked) {
      await showMobileUpdateDialog(
        context,
        release: result.release,
        currentVersion: result.current,
        forceUpdate: true,
      );
    }
  }

  Future<void> _syncPendingTelemetry() async {
    await AnalyticsTelemetryQueue.instance.flush();
    await OfflineBusinessSyncQueue.instance.flush();
    await CrashReporter.flushPendingReports();
    await MobileAnalyticsService.instance.flushTelemetry();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
