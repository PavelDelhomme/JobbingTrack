import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/services/admin_api_service.dart';
import 'package:jobbingtrack_mobile/utils/admin_metrics_parser.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_kpi_tile.dart';
import 'package:jobbingtrack_mobile/widgets/admin/admin_scroll.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';

/// Performances infra — CPU/RAM système + conteneurs (même source que backoffice).
class PerformanceScreen extends StatefulWidget {
  const PerformanceScreen({super.key});

  @override
  State<PerformanceScreen> createState() => _PerformanceScreenState();
}

class _PerformanceScreenState extends State<PerformanceScreen> {
  bool _loading = true;
  String? _error;
  SystemSnapshot? _system;
  List<ContainerSnapshot> _containers = [];
  List<ServiceSnapshot> _services = [];
  int _runningServices = 0;

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
      final results = await Future.wait([
        AdminApiService.fetchSystemMetrics(token: token),
        AdminApiService.fetchServicesStatus(token: token),
      ]);
      final metrics = Map<String, dynamic>.from(results[0] as Map);
      final servicesData = Map<String, dynamic>.from(results[1] as Map);
      if (mounted) {
        setState(() {
          _system = AdminMetricsParser.parseSystem(metrics);
          _containers = AdminMetricsParser.parseContainers(metrics);
          _services = AdminMetricsParser.parseServices(servicesData);
          _runningServices = _services.where((s) => s.status == 'running' || s.status == 'online').length;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _healthColor(String health) {
    switch (health.toLowerCase()) {
      case 'healthy':
        return Colors.green;
      case 'unhealthy':
        return Colors.red;
      default:
        return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Performances infra'),
        centerTitle: true,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
          const MobileNotificationCenter(),
        ],
      ),
      body: AdminSafeBody(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off, size: 48, color: Colors.orange),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                'Vérifiez que metrics-aggregator est UP (make up / docker).',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 16),
              FilledButton(onPressed: _load, child: const Text('Réessayer')),
            ],
          ),
        ),
      );
    }

    final sys = _system;
    final ts = sys?.timestamp != null
        ? DateTime.tryParse(sys!.timestamp!)?.toLocal().toString().substring(0, 19)
        : null;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: adminScrollPadding(context, base: const EdgeInsets.only(bottom: 8)),
        children: [
          if (ts != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text('Dernière collecte : $ts', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
            ),
          const AdminSectionTitle(title: 'Système hôte', subtitle: 'CPU, RAM, charge — temps réel'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                AdminKpiTile(
                  label: 'CPU système',
                  value: AdminMetricsParser.fmtPct(sys?.cpuPercent),
                  icon: Icons.memory,
                  color: Colors.blue,
                  subtitle: sys?.cpuCores != null ? '${sys!.cpuCores} cœurs' : null,
                ),
                AdminKpiTile(
                  label: 'RAM système',
                  value: AdminMetricsParser.fmtPct(sys?.memPercent),
                  icon: Icons.storage,
                  color: Colors.purple,
                  subtitle: sys?.memUsedMb != null && sys?.memTotalMb != null
                      ? '${AdminMetricsParser.fmtMb(sys!.memUsedMb)} / ${AdminMetricsParser.fmtMb(sys.memTotalMb)}'
                      : null,
                ),
                AdminKpiTile(
                  label: 'Charge 1 min',
                  value: sys?.load1?.toStringAsFixed(2) ?? '—',
                  icon: Icons.speed,
                  color: Colors.orange,
                  subtitle: sys?.load5 != null ? '5 min : ${sys!.load5!.toStringAsFixed(2)}' : null,
                ),
                AdminKpiTile(
                  label: 'Disponibilité',
                  value: AdminMetricsParser.fmtPct(sys?.availabilityPercent),
                  icon: Icons.check_circle_outline,
                  color: Colors.green,
                  subtitle: AdminMetricsParser.fmtMs(sys?.avgResponseMs),
                ),
              ],
            ),
          ),
          const AdminSectionTitle(
            title: 'Stack JobbingTrack',
            subtitle: 'Moyennes conteneurs projet + services actifs',
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                AdminKpiTile(
                  label: 'CPU projet',
                  value: AdminMetricsParser.fmtPct(sys?.projectCpuAvg),
                  icon: Icons.hub,
                  color: Colors.teal,
                ),
                AdminKpiTile(
                  label: 'RAM projet',
                  value: AdminMetricsParser.fmtPct(sys?.projectMemPercent),
                  icon: Icons.dns,
                  color: Colors.indigo,
                ),
                AdminKpiTile(
                  label: 'Services UP',
                  value: '$_runningServices / ${_services.length}',
                  icon: Icons.play_circle_outline,
                  color: Colors.green.shade700,
                  subtitle: sys?.containerCount != null ? '${sys!.containerCount} conteneurs' : null,
                ),
              ],
            ),
          ),
          const AdminSectionTitle(title: 'Conteneurs (top CPU)', subtitle: 'jobbingtrack-* triés par charge'),
          if (_containers.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Aucune métrique conteneur — metrics-aggregator indisponible ou stack arrêtée.'),
            )
          else
            ..._containers.take(15).map((c) => Card(
                  margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
                  child: ListTile(
                    dense: true,
                    title: Text(c.shortName, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      'RAM ${AdminMetricsParser.fmtPct(c.memPercent)} · ${AdminMetricsParser.fmtMb(c.memMb)}'
                      '${c.pids != null ? ' · ${c.pids} PID' : ''}',
                    ),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(AdminMetricsParser.fmtPct(c.cpuPercent),
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                        Text('CPU', style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                )),
          const AdminSectionTitle(title: 'Services', subtitle: 'Santé + métriques instantanées'),
          if (_services.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Liste services vide — fallback gateway ou agrégateur down.'),
            )
          else
            ..._services.map((s) {
              final running = s.status == 'running' || s.status == 'online';
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
                child: ListTile(
                  dense: true,
                  leading: Icon(
                    running ? Icons.circle : Icons.circle_outlined,
                    color: running ? Colors.green : Colors.grey,
                    size: 14,
                  ),
                  title: Text(s.name),
                  subtitle: Text('${s.status} · ${s.health}'),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        AdminMetricsParser.fmtPct(s.cpuPercent),
                        style: TextStyle(fontWeight: FontWeight.bold, color: _healthColor(s.health)),
                      ),
                      Text(
                        s.memUsage ?? AdminMetricsParser.fmtPct(s.memPercent),
                        style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}
