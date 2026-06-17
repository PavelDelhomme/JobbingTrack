import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/mobile_analytics_service.dart';

enum HelpFeedbackType {
  bug,
  suggestion,
  signalement,
}

extension HelpFeedbackTypeLabel on HelpFeedbackType {
  String get title {
    switch (this) {
      case HelpFeedbackType.bug:
        return 'Signaler un bug';
      case HelpFeedbackType.suggestion:
        return 'Envoyer une suggestion';
      case HelpFeedbackType.signalement:
        return 'Signalement';
    }
  }

  String get category {
    switch (this) {
      case HelpFeedbackType.bug:
        return 'bug';
      case HelpFeedbackType.suggestion:
        return 'suggestion';
      case HelpFeedbackType.signalement:
        return 'signalement';
    }
  }

  String get hint {
    switch (this) {
      case HelpFeedbackType.bug:
        return 'Décrivez ce qui s\'est passé, les étapes pour reproduire…';
      case HelpFeedbackType.suggestion:
        return 'Décrivez votre idée ou ce qui manque…';
      case HelpFeedbackType.signalement:
        return 'Décrivez le problème (sécurité, données, comportement)…';
    }
  }
}

class HelpFeedbackScreen extends StatefulWidget {
  final HelpFeedbackType type;

  const HelpFeedbackScreen({super.key, required this.type});

  @override
  State<HelpFeedbackScreen> createState() => _HelpFeedbackScreenState();
}

class _HelpFeedbackScreenState extends State<HelpFeedbackScreen> {
  final _messageCtrl = TextEditingController();
  bool _includeDiagnostics = true;
  bool _sending = false;

  @override
  void dispose() {
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final message = _messageCtrl.text.trim();
    if (message.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Merci de décrire en au moins 10 caractères')),
      );
      return;
    }
    setState(() => _sending = true);
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      await MobileAnalyticsService.instance.submitFeedback(
        category: widget.type.category,
        message: message,
        includeDiagnostics: _includeDiagnostics,
        authToken: auth.token,
        userId: auth.user?.id,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Merci — votre retour a été transmis')),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.type.title)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Votre message est transmis de façon sécurisée. Aucun mot de passe ni contenu de candidature n\'est inclus automatiquement.',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.4),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _messageCtrl,
              maxLines: 8,
              decoration: InputDecoration(
                hintText: widget.type.hint,
                border: const OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 12),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Joindre un diagnostic technique anonyme'),
              subtitle: const Text('Mémoire, écrans visités, erreurs récentes — aide à corriger plus vite'),
              value: _includeDiagnostics,
              onChanged: _sending ? null : (v) => setState(() => _includeDiagnostics = v ?? true),
            ),
            const Spacer(),
            FilledButton.icon(
              onPressed: _sending ? null : _submit,
              icon: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.send),
              label: Text(_sending ? 'Envoi…' : 'Envoyer'),
            ),
          ],
        ),
      ),
    );
  }
}
