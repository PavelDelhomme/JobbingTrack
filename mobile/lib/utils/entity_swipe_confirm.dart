import 'package:flutter/material.dart';

Future<bool> confirmArchiveEntity(
  BuildContext context, {
  required String title,
  required String message,
}) {
  return showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.amber.shade800),
              child: const Text('Archiver'),
            ),
          ],
        ),
      )
      .then((v) => v == true);
}

Future<bool> confirmTrashEntity(
  BuildContext context, {
  required String title,
  required String message,
}) {
  return showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade700),
              child: const Text('Corbeille'),
            ),
          ],
        ),
      )
      .then((v) => v == true);
}
