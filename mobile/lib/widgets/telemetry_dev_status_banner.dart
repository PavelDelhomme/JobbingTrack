import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/mobile_analytics_service.dart';

/// Bannière persistante (debug) : état file télémétrie et prochain flush.
class TelemetryDevStatusBanner extends StatefulWidget {
  final Widget? child;

  const TelemetryDevStatusBanner({super.key, required this.child});

  static bool get isVisible => false;

  static double topInset(BuildContext context) {
    if (!isVisible) return 0;
    return MediaQuery.paddingOf(context).top + 36;
  }

  @override
  State<TelemetryDevStatusBanner> createState() =>
      _TelemetryDevStatusBannerState();
}

class _TelemetryDevStatusBannerState extends State<TelemetryDevStatusBanner> {
  Timer? _tick;
  final _svc = MobileAnalyticsService.instance;

  @override
  void initState() {
    super.initState();
    if (TelemetryDevStatusBanner.isVisible) {
      _svc.addListener(_onStatusChange);
      _tick = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() {});
      });
    }
  }

  void _onStatusChange() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    if (TelemetryDevStatusBanner.isVisible) {
      _svc.removeListener(_onStatusChange);
      _tick?.cancel();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final child = widget.child;
    if (!TelemetryDevStatusBanner.isVisible || child == null) return child ?? const SizedBox.shrink();

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Padding(
          padding: EdgeInsets.only(top: TelemetryDevStatusBanner.topInset(context)),
          child: child,
        ),
        Positioned(
          left: 0,
          right: 0,
          top: 0,
          child: Material(
            elevation: 12,
            color: const Color(0xDD111827),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      _svc.isEnabled ? Icons.sync : Icons.sync_disabled,
                      size: 14,
                      color: _svc.isEnabled ? Colors.greenAccent : Colors.grey,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _svc.devTelemetryStatusLine,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          height: 1.25,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (_svc.isEnabled)
                      TextButton(
                        style: TextButton.styleFrom(
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          foregroundColor: Colors.lightBlueAccent,
                          padding: const EdgeInsets.only(left: 8),
                        ),
                        onPressed: _svc.flushInProgress
                            ? null
                            : () => _svc.flushTelemetry(),
                        child: const Text('Flush', style: TextStyle(fontSize: 10)),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
