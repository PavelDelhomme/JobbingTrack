import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

/// Calendrier et événements (API event-service).
class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  List<Map<String, dynamic>> _events = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      final events = await ApiService.getCalendarEvents(token: token);
      if (mounted) setState(() => _events = events);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Événements & Rappels'),
        actions: const [MobileNotificationCenter()],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text(_error!, textAlign: TextAlign.center),
                      ),
                      FilledButton(onPressed: _load, child: const Text('Réessayer')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _events.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            const SizedBox(height: 80),
                            Icon(Icons.event_note, size: 64, color: Colors.blue.shade300),
                            const SizedBox(height: 16),
                            const Center(child: Text('Aucun événement à venir')),
                            const SizedBox(height: 8),
                            Center(
                              child: Text(
                                'Les entretiens et relances planifiés apparaîtront ici.',
                                style: TextStyle(color: Colors.grey.shade600),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ],
                        )
                      : ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(12),
                          itemCount: _events.length,
                          itemBuilder: (_, i) {
                            final e = _events[i];
                            final title = e['title']?.toString() ?? 'Événement';
                            final start = e['startDate']?.toString();
                            final colorHex = e['color']?.toString();
                            final isInterim = colorHex != null &&
                                (colorHex.toUpperCase().contains('F59E0B') ||
                                    colorHex.toUpperCase().contains('F59'));
                            final iconColor = isInterim ? Colors.amber.shade700 : Colors.blue.shade700;
                            return Card(
                              child: ListTile(
                                leading: Icon(Icons.event, color: iconColor),
                                title: Text(title, maxLines: 2, overflow: TextOverflow.ellipsis),
                                subtitle: start != null
                                    ? Text(formatUserLocalDateTime(start))
                                    : null,
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}
