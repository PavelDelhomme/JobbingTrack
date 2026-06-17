import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/users/help_feedback_screen.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';
import 'package:jobbingtrack_mobile/services/mobile_analytics_service.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';
import 'package:jobbingtrack_mobile/widgets/back_to_home_scope.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _loading = true;
  bool _consent = false;
  bool _performance = true;
  bool _activityTrace = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _consent = false;
      _loading = true;
    });
    final consent = await ApiConfigStore.loadAnalyticsConsent();
    final perf = await ApiConfigStore.loadPerformanceTelemetryEnabled();
    final trace = await ApiConfigStore.loadActivityTraceEnabled();
    if (!mounted) return;
    setState(() {
      _consent = consent;
      _performance = perf;
      _activityTrace = trace;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return BackToHomeScope(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Paramètres'),
          centerTitle: true,
          actions: [MobileNotificationCenter()],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _sectionTitle('Confidentialité & télémétrie'),
                  Card(
                    child: Column(
                      children: [
                        SwitchListTile(
                          title: const Text('Partager des données anonymes'),
                          subtitle: const Text(
                            'Performances, navigation et stabilité — sans contenu personnel (RGPD).',
                          ),
                          value: _consent,
                          onChanged: (v) async {
                            setState(() => _consent = v);
                            await MobileAnalyticsService.instance.setConsent(
                              v,
                              authToken: auth.token,
                            );
                            if (v) {
                              setState(() {
                                _performance = true;
                                _activityTrace = true;
                              });
                            }
                          },
                        ),
                        const Divider(height: 1),
                        SwitchListTile(
                          title: const Text('Performances anonymes'),
                          subtitle: const Text('Latence API, mémoire, durée de session'),
                          value: _consent && _performance,
                          onChanged: _consent
                              ? (v) async {
                                  setState(() => _performance = v);
                                  await MobileAnalyticsService.instance.setPerformanceEnabled(v);
                                }
                              : null,
                        ),
                        SwitchListTile(
                          title: const Text('Trace d\'activité'),
                          subtitle: const Text('Écrans visités, types d\'actions — pas de texte saisi'),
                          value: _consent && _activityTrace,
                          onChanged: _consent
                              ? (v) async {
                                  setState(() => _activityTrace = v);
                                  await MobileAnalyticsService.instance.setActivityTraceEnabled(v);
                                }
                              : null,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Les retours manuels (bug, signalement) peuvent inclure un diagnostic technique sur votre demande, même si la télémétrie est désactivée.',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600, height: 1.35),
                  ),
                  const SizedBox(height: 24),
                  _sectionTitle('Aide & retours'),
                  Card(
                    child: Column(
                      children: [
                        ListTile(
                          leading: Icon(Icons.bug_report_outlined, color: Colors.orange.shade700),
                          title: const Text('Signaler un bug'),
                          subtitle: const Text('Problème technique, écran bloqué, crash'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => _openFeedback(context, HelpFeedbackType.bug),
                        ),
                        const Divider(height: 1),
                        ListTile(
                          leading: Icon(Icons.lightbulb_outline, color: Colors.amber.shade800),
                          title: const Text('Suggestion'),
                          subtitle: const Text('Idée d\'amélioration produit'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => _openFeedback(context, HelpFeedbackType.suggestion),
                        ),
                        const Divider(height: 1),
                        ListTile(
                          leading: Icon(Icons.flag_outlined, color: Colors.red.shade700),
                          title: const Text('Signalement'),
                          subtitle: const Text('Comportement suspect, données, sécurité'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => _openFeedback(context, HelpFeedbackType.signalement),
                        ),
                        const Divider(height: 1),
                        ListTile(
                          leading: Icon(Icons.insights_outlined, color: Colors.blue.shade700),
                          title: const Text('Diagnostic local'),
                          subtitle: const Text('Voir le résumé technique de cette session'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => _showDiagnostics(context),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  _sectionTitle('Application'),
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.info_outline),
                      title: const Text('Version'),
                      subtitle: const Text('JobbingTrack Mobile 1.0.0'),
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4),
      child: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
    );
  }

  void _openFeedback(BuildContext context, HelpFeedbackType type) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => HelpFeedbackScreen(type: type)),
    );
  }

  void _showDiagnostics(BuildContext context) {
    final preview = MobileAnalyticsService.instance.localDiagnosticsPreview();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Diagnostic local'),
        content: SingleChildScrollView(
          child: Text(
            preview.entries.map((e) => '${e.key}: ${e.value}').join('\n'),
            style: const TextStyle(fontSize: 12, fontFamily: 'monospace'),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Fermer')),
        ],
      ),
    );
  }
}
