class SystemSnapshot {
  final double? cpuPercent;
  final int? cpuCores;
  final double? memPercent;
  final double? memUsedMb;
  final double? memTotalMb;
  final double? load1;
  final double? load5;
  final double? diskPercent;
  final double? availabilityPercent;
  final double? avgResponseMs;
  final int? containerCount;
  final double? projectCpuAvg;
  final double? projectMemPercent;
  final String? timestamp;

  const SystemSnapshot({
    this.cpuPercent,
    this.cpuCores,
    this.memPercent,
    this.memUsedMb,
    this.memTotalMb,
    this.load1,
    this.load5,
    this.diskPercent,
    this.availabilityPercent,
    this.avgResponseMs,
    this.containerCount,
    this.projectCpuAvg,
    this.projectMemPercent,
    this.timestamp,
  });
}

class ContainerSnapshot {
  final String name;
  final String shortName;
  final double? cpuPercent;
  final double? memPercent;
  final double? memMb;
  final double? memLimitMb;
  final int? pids;

  const ContainerSnapshot({
    required this.name,
    required this.shortName,
    this.cpuPercent,
    this.memPercent,
    this.memMb,
    this.memLimitMb,
    this.pids,
  });
}

class ServiceSnapshot {
  final String name;
  final String status;
  final String health;
  final double? cpuPercent;
  final String? memUsage;
  final double? memPercent;

  const ServiceSnapshot({
    required this.name,
    required this.status,
    required this.health,
    this.cpuPercent,
    this.memUsage,
    this.memPercent,
  });
}

class AdminMetricsParser {
  static double? numVal(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    final s = v.toString().trim();
    if (s.isEmpty || s.toLowerCase() == 'n/a') return null;
    final cleaned = s.replaceAll('%', '').replaceAll('MB', '').replaceAll('ms', '').trim();
    return double.tryParse(cleaned);
  }

  static Map<String, dynamic>? map(dynamic v) =>
      v is Map ? Map<String, dynamic>.from(v) : null;

  static SystemSnapshot parseSystem(Map<String, dynamic> data) {
    final system = map(data['system']) ?? {};
    final cpu = map(system['cpu']) ?? {};
    final memory = map(system['memory']) ?? {};
    final load = map(system['load']) ?? {};
    final disk = map(system['disk']) ?? system['disk'];
    final jt = map(system['jobbingtrack']) ?? {};
    final jtContainers = map(jt['containers']) ?? {};

    double? diskPct;
    if (disk is List && disk.isNotEmpty) {
      diskPct = numVal(map(disk.first)?['usage_percent'] ?? map(disk.first)?['usage']);
    } else if (disk is Map) {
      diskPct = numVal(disk['usage_percent'] ?? disk['usage']);
    }

    return SystemSnapshot(
      cpuPercent: numVal(cpu['usage_percent'] ?? cpu['percentage'] ?? cpu['usage']),
      cpuCores: numVal(cpu['cores'])?.toInt(),
      memPercent: numVal(memory['usage_percent'] ?? memory['percentage'] ?? memory['usage']),
      memUsedMb: numVal(memory['used_mb'] ?? memory['usedMb'] ?? memory['used']),
      memTotalMb: numVal(memory['total_mb'] ?? memory['totalMb'] ?? memory['total']),
      load1: numVal(load['load1'] ?? load['1m'] ?? load['average']),
      load5: numVal(load['load5'] ?? load['5m']),
      diskPercent: diskPct,
      availabilityPercent: numVal(data['availability_percent'] ?? data['availabilityPercent'] ?? system['availability_percent']),
      avgResponseMs: numVal(data['avg_response_time_ms'] ?? system['avg_response_time_ms']),
      containerCount: numVal(jtContainers['count'] ?? system['container_count'])?.toInt(),
      projectCpuAvg: numVal(jtContainers['cpu']?['averagePercent'] ?? jtContainers['cpu']?['average_percent']),
      projectMemPercent: numVal(jtContainers['memory']?['percent'] ?? jtContainers['memory']?['usage_percent']),
      timestamp: data['timestamp']?.toString(),
    );
  }

  static List<ContainerSnapshot> parseContainers(Map<String, dynamic> data) {
    final raw = map(data['containers']) ?? {};
    final rows = <ContainerSnapshot>[];

    raw.forEach((key, value) {
      final m = map(value);
      if (m == null) return;
      final cpu = map(m['cpu']) ?? {};
      final mem = map(m['memory']) ?? {};
      final fullName = key.toString();
      rows.add(ContainerSnapshot(
        name: fullName,
        shortName: fullName.replaceFirst(RegExp(r'^jobbingtrack-'), ''),
        cpuPercent: numVal(cpu['percentage'] ?? cpu['percent'] ?? cpu['usage'] ?? m['cpu_percent']),
        memPercent: numVal(mem['percentage'] ?? mem['percent'] ?? mem['usage'] ?? m['memory_percent']),
        memMb: numVal(mem['usageMb'] ?? mem['usage_mb'] ?? mem['usage']),
        memLimitMb: numVal(mem['limitMb'] ?? mem['limit_mb'] ?? mem['limit']),
        pids: numVal(m['pids'])?.toInt(),
      ));
    });

    rows.sort((a, b) => (b.cpuPercent ?? 0).compareTo(a.cpuPercent ?? 0));
    return rows.where((r) => r.name.startsWith('jobbingtrack-')).toList();
  }

  static List<ServiceSnapshot> parseServices(Map<String, dynamic> data) {
    final list = data['services'] as List? ?? [];
    return list.map((item) {
      final m = map(item)!;
      final metrics = map(m['metrics']);
      final mem = map(metrics?['memory']);
      return ServiceSnapshot(
        name: m['name']?.toString() ?? '?',
        status: m['status']?.toString() ?? 'unknown',
        health: m['health']?.toString() ?? 'unknown',
        cpuPercent: numVal(metrics?['cpu']),
        memUsage: mem?['usage']?.toString(),
        memPercent: numVal(mem?['percent']),
      );
    }).toList()
      ..sort((a, b) => (b.cpuPercent ?? 0).compareTo(a.cpuPercent ?? 0));
  }

  static String fmtPct(double? v) => v == null ? '—' : '${v.toStringAsFixed(1)} %';

  static String fmtMb(double? v) => v == null ? '—' : '${v.toStringAsFixed(0)} Mo';

  static String fmtMs(double? v) => v == null ? '—' : '${v.toStringAsFixed(0)} ms';
}
