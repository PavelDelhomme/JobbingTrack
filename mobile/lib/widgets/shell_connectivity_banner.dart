import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/network_recovery_service.dart';
import 'package:jobbingtrack_mobile/services/offline_business_sync_queue.dart';
import 'package:jobbingtrack_mobile/services/shell_data_refresh_service.dart';
import 'package:jobbingtrack_mobile/widgets/offline_mode_banner.dart';

/// Bandeau shell : hors ligne et/ou file de sync en attente.
class ShellConnectivityBanner extends StatefulWidget {
  const ShellConnectivityBanner({super.key});

  @override
  State<ShellConnectivityBanner> createState() => _ShellConnectivityBannerState();
}

class _ShellConnectivityBannerState extends State<ShellConnectivityBanner> {
  bool _online = true;
  int _pending = 0;
  bool _busy = false;
  bool _alive = true;

  @override
  void initState() {
    super.initState();
    _refresh();
    _pollLoop();
  }

  @override
  void dispose() {
    _alive = false;
    super.dispose();
  }

  Future<void> _pollLoop() async {
    while (_alive) {
      await Future<void>.delayed(const Duration(seconds: 6));
      if (!_alive || !mounted) return;
      await _refresh();
    }
  }

  Future<void> _refresh() async {
    final online = await ApiService.isReachable();
    await OfflineBusinessSyncQueue.instance.initialize();
    final pending = OfflineBusinessSyncQueue.instance.pendingCount;
    if (!mounted) return;
    setState(() {
      _online = online;
      _pending = pending;
    });
  }

  Future<void> _retry() async {
    setState(() => _busy = true);
    try {
      await NetworkRecoveryService.recoverConnection();
      await OfflineBusinessSyncQueue.instance.flush();
      await ShellDataRefreshService.refreshIfStale(force: true);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
        await _refresh();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_online && _pending == 0) return const SizedBox.shrink();
    if (!_online) {
      return OfflineModeBanner(
        pendingSyncCount: _pending,
        onRetry: _busy ? null : _retry,
      );
    }
    return Material(
      color: Colors.amber.shade50,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            Icon(Icons.sync, size: 18, color: Colors.amber.shade900),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '$_pending modification(s) en attente de synchronisation',
                style: TextStyle(fontSize: 13, color: Colors.amber.shade900),
              ),
            ),
            TextButton(
              onPressed: _busy ? null : _retry,
              child: _busy
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Sync'),
            ),
          ],
        ),
      ),
    );
  }
}
