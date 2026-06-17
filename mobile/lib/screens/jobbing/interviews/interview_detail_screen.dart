import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/widgets/entity_detail_field.dart';

class InterviewDetailScreen extends StatefulWidget {
  final Interview interview;

  const InterviewDetailScreen({super.key, required this.interview});

  @override
  State<InterviewDetailScreen> createState() => _InterviewDetailScreenState();
}

class _InterviewDetailScreenState extends State<InterviewDetailScreen> {
  Interview? _interview;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      final fresh = await ApiService.getInterview(widget.interview.id, token: token);
      if (mounted) setState(() {
        _interview = fresh;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() {
        _interview = widget.interview;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final i = _interview ?? widget.interview;
    return Scaffold(
      appBar: AppBar(title: const Text('Entretien')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                EntityDetailField(
                  label: 'Date',
                  value: formatSmartEventDate(i.interviewDate),
                ),
                EntityDetailField(label: 'Lieu', value: i.location ?? ''),
                EntityDetailField(label: 'Lien visio', value: i.videoLink ?? ''),
                EntityDetailField(label: 'Notes', value: i.notes ?? '', multiline: true),
                if (i.estimatedDuration != null)
                  EntityDetailField(label: 'Durée estimée', value: '${i.estimatedDuration} min'),
              ],
            ),
    );
  }
}
