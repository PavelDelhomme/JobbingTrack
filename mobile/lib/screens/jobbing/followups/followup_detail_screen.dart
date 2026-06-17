import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/application_labels.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/widgets/entity_detail_field.dart';

class FollowupDetailScreen extends StatefulWidget {
  final FollowUp followUp;

  const FollowupDetailScreen({super.key, required this.followUp});

  @override
  State<FollowupDetailScreen> createState() => _FollowupDetailScreenState();
}

class _FollowupDetailScreenState extends State<FollowupDetailScreen> {
  FollowUp? _followUp;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      final fresh = await ApiService.getFollowUp(widget.followUp.id, token: token);
      if (mounted) setState(() {
        _followUp = fresh;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() {
        _followUp = widget.followUp;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final f = _followUp ?? widget.followUp;
    return Scaffold(
      appBar: AppBar(title: const Text('Relance')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                EntityDetailField(
                  label: 'Date prévue',
                  value: formatSmartEventDate(f.scheduledDate),
                ),
                EntityDetailField(label: 'Statut', value: followUpStatusLabel(f.status)),
                EntityDetailField(label: 'Type', value: f.type),
                EntityDetailField(label: 'Notes', value: f.notes ?? '', multiline: true),
                EntityDetailField(label: 'Réponse', value: f.response ?? '', multiline: true),
                if (f.completedAt != null)
                  EntityDetailField(
                    label: 'Terminée le',
                    value: formatUserLocalDateTime(f.completedAt!.toIso8601String()),
                  ),
              ],
            ),
    );
  }
}
