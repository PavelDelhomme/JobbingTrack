import 'dart:io';

import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/mobile_update_service.dart';
import 'package:url_launcher/url_launcher.dart';

Future<bool> showMobileUpdateDialog(
  BuildContext context, {
  required MobileReleaseInfo release,
  required String currentVersion,
  required bool forceUpdate,
}) async {
  var installing = false;
  String? error;

  final proceed = await showDialog<bool>(
    context: context,
    barrierDismissible: !forceUpdate,
    builder: (ctx) {
      return StatefulBuilder(
        builder: (context, setState) {
          Future<void> install() async {
            setState(() {
              installing = true;
              error = null;
            });
            try {
              if (Platform.isAndroid) {
                final url = release.downloadUrl;
                if (url == null || url.isEmpty) {
                  throw Exception('URL de téléchargement APK absente côté serveur');
                }
                await MobileUpdateService.downloadAndInstallAndroid(url);
              } else {
                final store = release.storeUrl ?? release.downloadUrl;
                if (store == null || store.isEmpty) {
                  throw Exception('URL App Store absente côté serveur');
                }
                final uri = Uri.parse(store);
                if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
                  throw Exception('Impossible d’ouvrir l’App Store');
                }
              }
              if (context.mounted) Navigator.of(context).pop(false);
            } catch (e) {
              setState(() {
                installing = false;
                error = e.toString();
              });
            }
          }

          return AlertDialog(
            title: Text(forceUpdate ? 'Mise à jour obligatoire' : 'Mise à jour disponible'),
            content: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Version installée : $currentVersion'),
                  Text('Nouvelle version : ${release.displayVersion}'),
                  if (release.releaseNotes.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(release.releaseNotes),
                  ],
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    Text(error!, style: const TextStyle(color: Colors.red)),
                  ],
                ],
              ),
            ),
            actions: [
              if (!forceUpdate)
                TextButton(
                  onPressed: installing ? null : () => Navigator.of(context).pop(true),
                  child: const Text('Plus tard'),
                ),
              FilledButton(
                onPressed: installing ? null : install,
                child: installing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(Platform.isAndroid ? 'Télécharger et installer' : 'Ouvrir l’App Store'),
              ),
            ],
          );
        },
      );
    },
  );

  return proceed ?? false;
}
