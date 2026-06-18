import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/crash_reporter.dart';
import 'package:jobbingtrack_mobile/services/diagnostic_payload_codec.dart';
import 'package:jobbingtrack_mobile/services/mobile_analytics_service.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';

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
        return 'Signalement sécurité / comportement';
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
        return 'Décrivez le problème (sécurité, données, comportement suspect)…';
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
  final _captureKey = GlobalKey();
  final _fieldKey = GlobalKey();
  final _scrollCtrl = ScrollController();
  final _messageFocus = FocusNode();
  bool _includeDiagnostics = true;
  bool _includeScreenshot = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    CrashReporter.setCurrentScreen('help_feedback/${widget.type.category}');
    _messageFocus.addListener(_scrollFieldIntoView);
  }

  void _scrollFieldIntoView() {
    if (!_messageFocus.hasFocus) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final fieldContext = _fieldKey.currentContext;
      if (fieldContext == null || !mounted) return;
      Scrollable.ensureVisible(
        fieldContext,
        alignment: 0.2,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  void dispose() {
    _messageFocus.removeListener(_scrollFieldIntoView);
    _messageFocus.dispose();
    _messageCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<String?> _captureScreenshot() async {
    try {
      final boundary =
          _captureKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) return null;
      final image = await boundary.toImage(pixelRatio: 0.35);
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      if (data == null) return null;
      return DiagnosticPayloadCodec.compressBytes(data.buffer.asUint8List());
    } catch (_) {
      return null;
    }
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
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
      final screenshot = _includeScreenshot ? await _captureScreenshot() : null;
      await MobileAnalyticsService.instance.submitFeedback(
        category: widget.type.category,
        message: message,
        includeDiagnostics: _includeDiagnostics,
        screenshotCompressed: screenshot,
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

  Widget _submitAction({required bool compact}) {
    return TextButton.icon(
      onPressed: _sending ? null : _submit,
      icon: _sending
          ? SizedBox(
              width: compact ? 16 : 18,
              height: compact ? 16 : 18,
              child: const CircularProgressIndicator(strokeWidth: 2),
            )
          : Icon(Icons.send, size: compact ? 20 : 18),
      label: Text(_sending ? '…' : 'Envoyer'),
    );
  }

  @override
  Widget build(BuildContext context) {
    final keyboardBottom = MediaQuery.viewInsetsOf(context).bottom;

    return Scaffold(
      resizeToAvoidBottomInset: false,
      appBar: AppBar(
        title: Text(widget.type.title),
        actions: [_submitAction(compact: true)],
      ),
      body: AnimatedPadding(
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        padding: EdgeInsets.only(bottom: keyboardBottom),
        child: RepaintBoundary(
          key: _captureKey,
          child: SafeArea(
            bottom: false,
            child: SingleChildScrollView(
              controller: _scrollCtrl,
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: scrollSafePadding(context, top: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      'Votre message est transmis de façon sécurisée. Aucun mot de passe ni contenu de candidature n\'est inclus automatiquement.',
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.4),
                    ),
                  ),
                  TextField(
                    key: _fieldKey,
                    controller: _messageCtrl,
                    focusNode: _messageFocus,
                    minLines: 4,
                    maxLines: 12,
                    textInputAction: TextInputAction.newline,
                    decoration: InputDecoration(
                      hintText: widget.type.hint,
                      border: const OutlineInputBorder(),
                      alignLabelWithHint: true,
                      filled: true,
                      fillColor: Theme.of(context)
                          .colorScheme
                          .surfaceContainerHighest
                          .withValues(alpha: 0.35),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Material(
                    color: Colors.transparent,
                    child: CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Joindre une capture d\'écran'),
                      subtitle: const Text(
                        'Capture compressée de cet écran (sans contenu saisi sensible)',
                      ),
                      value: _includeScreenshot,
                      onChanged: _sending
                          ? null
                          : (v) => setState(() => _includeScreenshot = v ?? true),
                    ),
                  ),
                  Material(
                    color: Colors.transparent,
                    child: CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Joindre un diagnostic technique anonyme'),
                      subtitle: const Text(
                        'Mémoire, écrans visités, erreurs récentes, version Android — aide à corriger plus vite',
                      ),
                      value: _includeDiagnostics,
                      onChanged: _sending
                          ? null
                          : (v) => setState(() => _includeDiagnostics = v ?? true),
                    ),
                  ),
                  const SizedBox(height: 8),
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
          ),
        ),
      ),
    );
  }
}
