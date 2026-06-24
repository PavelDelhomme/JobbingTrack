import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/email_agent_service.dart';
import 'package:jobbingtrack_mobile/utils/scroll_padding.dart';
import 'package:jobbingtrack_mobile/widgets/back_to_home_scope.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';
import 'package:intl/intl.dart';

class EmailAgentScreen extends StatefulWidget {
  const EmailAgentScreen({super.key});

  @override
  State<EmailAgentScreen> createState() => _EmailAgentScreenState();
}

class _EmailAgentScreenState extends State<EmailAgentScreen> {
  bool _loading = true;
  bool _actionLoading = false;
  String? _error;
  EmailAgentStatus? _status;
  List<EmailAgentTriageMessage> _messages = [];
  final Map<String, bool> _consentDraft = {};
  String? _discoveryHint;

  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _hostCtrl = TextEditingController();
  final _portCtrl = TextEditingController(text: '993');
  final _displayNameCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _hostCtrl.dispose();
    _portCtrl.dispose();
    _displayNameCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final status = await EmailAgentService.fetchStatus(token: token);
      for (final type in emailAgentConsentOrder) {
        final found = status.consents.where((c) => c.consentType == type).toList();
        _consentDraft[type] = found.isNotEmpty && found.first.granted;
      }
      List<EmailAgentTriageMessage> messages = [];
      if (status.accessAllowed) {
        messages = await EmailAgentService.fetchTriage(token: token);
      }
      if (!mounted) return;
      setState(() {
        _status = status;
        _messages = messages;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _runAction(Future<void> Function() action, {String? success}) async {
    setState(() {
      _actionLoading = true;
      _error = null;
    });
    try {
      await action();
      await _load();
      if (success != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(success)));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString().replaceAll('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _discoverImap() async {
    final email = _emailCtrl.text.trim();
    if (!email.contains('@')) return;
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    setState(() => _discoveryHint = 'Détection du serveur IMAP…');
    try {
      final suggestion = await EmailAgentService.discoverImap(token: token, emailAddress: email);
      if (!mounted) return;
      if (suggestion == null) {
        setState(() => _discoveryHint = 'Aucune suggestion — saisissez l\'hôte manuellement.');
        return;
      }
      if (_hostCtrl.text.trim().isEmpty) _hostCtrl.text = suggestion.imapHost;
      if (_portCtrl.text == '993') _portCtrl.text = suggestion.imapPort.toString();
      if (_displayNameCtrl.text.trim().isEmpty) _displayNameCtrl.text = email;
      final note = suggestion.note == 'proton_bridge_required'
          ? ' (Proton Bridge requis)'
          : '';
      setState(() {
        _discoveryHint =
            '${suggestion.provider ?? 'Serveur'} : ${suggestion.imapHost}:${suggestion.imapPort}$note';
      });
    } catch (e) {
      if (mounted) {
        setState(() => _discoveryHint = 'Détection indisponible — saisie manuelle.');
      }
    }
  }

  Future<void> _saveConsents() async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    await _runAction(() async {
      await EmailAgentService.updateConsents(
        token: token,
        consents: emailAgentConsentOrder
            .map((type) => {
                  'consentType': type,
                  'granted': _consentDraft[type] == true,
                })
            .toList(),
      );
    }, success: 'Consentements enregistrés');
  }

  Future<void> _connectImap() async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    await _runAction(() async {
      await EmailAgentService.connectImap(
        token: token,
        emailAddress: _emailCtrl.text.trim(),
        password: _passwordCtrl.text,
        imapHost: _hostCtrl.text.trim(),
        imapPort: int.tryParse(_portCtrl.text.trim()) ?? 993,
        displayName: _displayNameCtrl.text.trim().isEmpty
            ? _emailCtrl.text.trim()
            : _displayNameCtrl.text.trim(),
      );
      _passwordCtrl.clear();
    }, success: 'Boîte IMAP connectée');
  }

  Future<void> _sync() async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    await _runAction(() async {
      await EmailAgentService.syncNow(token: token);
    }, success: 'Synchronisation terminée');
  }

  Future<void> _revokeMailbox(EmailAgentMailbox mailbox) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Révoquer la boîte ?'),
        content: Text('Arrêter la sync pour ${mailbox.emailAddress} ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Révoquer')),
        ],
      ),
    );
    if (ok != true) return;
    if (!mounted) return;
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    await _runAction(() async {
      await EmailAgentService.revokeMailbox(token: token, mailboxId: mailbox.id);
    }, success: 'Boîte révoquée');
  }

  Future<void> _dismissMessage(EmailAgentTriageMessage msg) async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    await _runAction(() async {
      await EmailAgentService.reviewTriage(
        token: token,
        messageId: msg.id,
        reviewStatus: 'DISMISSED',
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final status = _status;
    final dateFmt = DateFormat('dd/MM/yyyy HH:mm', 'fr_FR');

    return BackToHomeScope(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Agent email'),
          centerTitle: true,
          actions: [
            if (status?.accessAllowed == true)
              IconButton(
                icon: _actionLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.sync),
                tooltip: 'Synchroniser',
                onPressed: _actionLoading ? null : _sync,
              ),
            const MobileNotificationCenter(),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: scrollSafePadding(context),
                  children: [
                    if (_error != null)
                      Card(
                        color: Colors.red.shade50,
                        child: ListTile(
                          leading: Icon(Icons.error_outline, color: Colors.red.shade700),
                          title: Text(_error!, style: TextStyle(color: Colors.red.shade900)),
                        ),
                      ),
                    _statusCard(status),
                    if (status != null && !status.agentEnabled) ...[
                      const SizedBox(height: 16),
                      _infoCard(
                        'Agent non activé',
                        'Demandez à un administrateur d\'activer l\'agent recherche sur votre compte. '
                        'Votre email d\'inscription (${Provider.of<AuthProvider>(context).user?.email ?? ''}) '
                        'recevra les digests une fois configuré.',
                      ),
                    ],
                    if (status != null && status.agentEnabled) ...[
                      const SizedBox(height: 16),
                      _sectionTitle('Consentements'),
                      Card(
                        child: Column(
                          children: [
                            for (final type in emailAgentConsentOrder) ...[
                              CheckboxListTile(
                                title: Text(emailAgentConsentLabels[type] ?? type),
                                subtitle: Text(_consentSubtitle(type)),
                                value: _consentDraft[type] == true,
                                onChanged: (v) => setState(() => _consentDraft[type] = v == true),
                              ),
                              if (type != emailAgentConsentOrder.last) const Divider(height: 1),
                            ],
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: _actionLoading ? null : _saveConsents,
                                  child: const Text('Enregistrer les consentements'),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      _sectionTitle('Boîtes connectées'),
                      if (status.mailboxes.isEmpty)
                        _infoCard('Aucune boîte', 'Ajoutez une boîte IMAP ci-dessous ou liez Gmail depuis le web.')
                      else
                        Card(
                          child: Column(
                            children: status.mailboxes.map((mb) {
                              return Column(
                                children: [
                                  ListTile(
                                    leading: const Icon(Icons.mail_outline),
                                    title: Text(mb.emailAddress),
                                    subtitle: Text(
                                      '${mb.provider} · ${mb.lastSyncStatus ?? '—'}'
                                      '${mb.lastSyncAt != null ? ' · ${dateFmt.format(mb.lastSyncAt!.toLocal())}' : ''}',
                                    ),
                                    trailing: IconButton(
                                      icon: const Icon(Icons.link_off),
                                      tooltip: 'Révoquer',
                                      onPressed: _actionLoading ? null : () => _revokeMailbox(mb),
                                    ),
                                  ),
                                  if (mb != status.mailboxes.last) const Divider(height: 1),
                                ],
                              );
                            }).toList(),
                          ),
                        ),
                      const SizedBox(height: 16),
                      _sectionTitle('Ajouter une boîte IMAP'),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              TextField(
                                controller: _emailCtrl,
                                decoration: const InputDecoration(
                                  labelText: 'Adresse email',
                                  border: OutlineInputBorder(),
                                ),
                                keyboardType: TextInputType.emailAddress,
                                onEditingComplete: _discoverImap,
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _passwordCtrl,
                                decoration: const InputDecoration(
                                  labelText: 'Mot de passe / app password',
                                  border: OutlineInputBorder(),
                                ),
                                obscureText: true,
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _hostCtrl,
                                decoration: const InputDecoration(
                                  labelText: 'Hôte IMAP',
                                  hintText: 'imap.mail.ovh.net',
                                  border: OutlineInputBorder(),
                                ),
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _portCtrl,
                                decoration: const InputDecoration(
                                  labelText: 'Port',
                                  border: OutlineInputBorder(),
                                ),
                                keyboardType: TextInputType.number,
                              ),
                              if (_discoveryHint != null) ...[
                                const SizedBox(height: 8),
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: Text(
                                    _discoveryHint!,
                                    style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                                  ),
                                ),
                              ],
                              const SizedBox(height: 16),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  onPressed: (_actionLoading || status.hasRequiredConsents != true)
                                      ? null
                                      : _connectImap,
                                  icon: const Icon(Icons.add),
                                  label: const Text('Connecter la boîte IMAP'),
                                ),
                              ),
                              if (!status.hasRequiredConsents)
                                Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Text(
                                    'Accordez les consentements requis avant de connecter une boîte.',
                                    style: TextStyle(fontSize: 12, color: Colors.orange.shade800),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                      if (status.accessAllowed) ...[
                        const SizedBox(height: 16),
                        _sectionTitle('À traiter (${_messages.length})'),
                        if (_messages.isEmpty)
                          _infoCard('Rien en attente', 'Synchronisez vos boîtes pour importer les emails.')
                        else
                          ..._messages.map((msg) => Card(
                                child: ListTile(
                                  isThreeLine: true,
                                  title: Text(msg.subject, maxLines: 2, overflow: TextOverflow.ellipsis),
                                  subtitle: Text(
                                    '${msg.fromAddress}\n${dateFmt.format(msg.receivedAt.toLocal())}'
                                    '${msg.classification != null ? ' · ${msg.classification}' : ''}',
                                  ),
                                  trailing: IconButton(
                                    icon: const Icon(Icons.check_circle_outline),
                                    tooltip: 'Ignorer',
                                    onPressed: _actionLoading ? null : () => _dismissMessage(msg),
                                  ),
                                ),
                              )),
                      ],
                    ],
                    const SizedBox(height: 24),
                  ],
                ),
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

  Widget _statusCard(EmailAgentStatus? status) {
    if (status == null) return const SizedBox.shrink();
    Color color;
    String label;
    if (!status.agentEnabled) {
      color = Colors.orange;
      label = 'Agent désactivé';
    } else if (!status.hasRequiredConsents) {
      color = Colors.amber.shade800;
      label = 'Consentements incomplets';
    } else if (status.accessAllowed) {
      color = Colors.green;
      label = 'Actif · ${status.pendingTriageCount} en attente';
    } else {
      color = Colors.blueGrey;
      label = status.accessReason.isNotEmpty ? status.accessReason : 'Configuration requise';
    }
    return Card(
      color: color.withValues(alpha: 0.12),
      child: ListTile(
        leading: Icon(Icons.smart_toy_outlined, color: color),
        title: Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: color)),
        subtitle: Text(
          '${status.mailboxes.length} boîte(s) · email compte : '
          '${Provider.of<AuthProvider>(context).user?.email ?? ''}',
        ),
      ),
    );
  }

  Widget _infoCard(String title, String body) {
    return Card(
      child: ListTile(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(body),
      ),
    );
  }

  String _consentSubtitle(String type) {
    switch (type) {
      case 'MAILBOX_ACCESS':
        return 'Lecture seule des emails de recherche d\'emploi.';
      case 'CONTENT_CLASSIFICATION':
        return 'Détection refus, entretiens, relances.';
      case 'DIGEST_NOTIFICATIONS':
        return 'Récap quotidien vers votre email d\'inscription.';
      case 'GOOGLE_CALENDAR':
        return 'Propositions d\'événements calendrier.';
      case 'GOOGLE_TASKS':
        return 'Synchronisation des tâches.';
      case 'AI_PROCESSING':
        return 'Optionnel — enrichissement assisté.';
      default:
        return '';
    }
  }
}
