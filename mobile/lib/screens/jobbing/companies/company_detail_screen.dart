import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/widgets/entity_detail_field.dart';

class CompanyDetailScreen extends StatefulWidget {
  final Company company;

  const CompanyDetailScreen({super.key, required this.company});

  @override
  State<CompanyDetailScreen> createState() => _CompanyDetailScreenState();
}

class _CompanyDetailScreenState extends State<CompanyDetailScreen> {
  Company? _company;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (widget.company.id.isEmpty) {
      setState(() {
        _company = widget.company;
        _loading = false;
      });
      return;
    }
    final token = Provider.of<AuthProvider>(context, listen: false).token;
    try {
      final fresh = await ApiService.getCompany(widget.company.id, token: token);
      if (mounted) setState(() {
        _company = fresh;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() {
        _company = widget.company;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _company ?? widget.company;
    return Scaffold(
      appBar: AppBar(title: Text(c.name.isNotEmpty ? c.name : 'Entreprise')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                EntityDetailField(label: 'Nom', value: c.name),
                EntityDetailField(label: 'Site web', value: c.website),
                EntityDetailField(label: 'Secteur', value: c.industry),
                EntityDetailField(label: 'Taille', value: c.size),
                EntityDetailField(label: 'Localisation', value: c.location),
                EntityDetailField(label: 'Description', value: c.description, multiline: true),
                EntityDetailField(
                  label: 'Créée le',
                  value: formatUserLocalDateTime(c.createdAt.toIso8601String(), pattern: 'd MMM y HH:mm'),
                ),
              ],
            ),
    );
  }
}
