import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/mobile_update_controller.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_update_dialog.dart';

/// Bandeau « Mise à jour disponible » — visible dans le shell tant qu’une MAJ attend.
class MobileUpdateBanner extends StatelessWidget {
  const MobileUpdateBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: MobileUpdateController.instance,
      builder: (context, _) {
        final ctrl = MobileUpdateController.instance;
        final release = ctrl.pendingRelease;
        if (release == null) return const SizedBox.shrink();
        return Material(
          color: Colors.blue.shade50,
          child: InkWell(
            onTap: () async {
              await showMobileUpdateDialog(
                context,
                release: release,
                currentVersion: ctrl.currentVersion ?? '?',
                forceUpdate: ctrl.forceUpdate,
              );
              await ctrl.refresh(silent: true);
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  Icon(Icons.system_update, size: 18, color: Colors.blue.shade800),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Mise à jour ${release.displayVersion} disponible — appuyer pour installer',
                      style: TextStyle(fontSize: 13, color: Colors.blue.shade900),
                    ),
                  ),
                  Icon(Icons.chevron_right, color: Colors.blue.shade700),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
