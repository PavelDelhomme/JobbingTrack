import 'package:jobbingtrack_mobile/utils/admin_time_range.dart';

/// Agrège les métriques performance remontées par les appareils mobile.
class MobileDevicePerfSummary {
  final String deviceKey;
  final String? deviceModel;
  final String? osVersion;
  final String? appVersion;
  final int sampleCount;
  final double? avgLatencyMs;
  final double? maxLatencyMs;
  final double? avgCpu;
  final double? avgMemory;
  final DateTime? lastSeen;

  const MobileDevicePerfSummary({
    required this.deviceKey,
    this.deviceModel,
    this.osVersion,
    this.appVersion,
    required this.sampleCount,
    this.avgLatencyMs,
    this.maxLatencyMs,
    this.avgCpu,
    this.avgMemory,
    this.lastSeen,
  });
}

class MobilePerfAggregator {
  static List<MobileDevicePerfSummary> summarize(List<Map<String, dynamic>> rows) {
    final byDevice = <String, List<Map<String, dynamic>>>{};
    for (final row in rows) {
      final key = (row['deviceId'] ?? row['sessionId'] ?? row['userId'] ?? 'inconnu').toString();
      byDevice.putIfAbsent(key, () => []).add(row);
    }

    return byDevice.entries.map((e) {
      final list = e.value;
      double? avgOf(String key) {
        final vals = list.map((r) => _num(r[key])).whereType<double>().toList();
        if (vals.isEmpty) return null;
        return vals.reduce((a, b) => a + b) / vals.length;
      }

      double? maxOf(String key) {
        final vals = list.map((r) => _num(r[key])).whereType<double>().toList();
        if (vals.isEmpty) return null;
        return vals.reduce((a, b) => a > b ? a : b);
      }

      DateTime? last;
      for (final r in list) {
        final t = DateTime.tryParse((r['timestamp'] ?? '').toString());
        if (t != null && (last == null || t.isAfter(last))) last = t;
      }

      final sample = list.first;
      return MobileDevicePerfSummary(
        deviceKey: e.key,
        deviceModel: sample['deviceModel']?.toString(),
        osVersion: sample['osVersion']?.toString(),
        appVersion: sample['appVersion']?.toString(),
        sampleCount: list.length,
        avgLatencyMs: avgOf('duration') ?? avgOf('networkLatency') ?? avgOf('value'),
        maxLatencyMs: maxOf('duration') ?? maxOf('networkLatency'),
        avgCpu: avgOf('cpuUsage'),
        avgMemory: avgOf('memoryUsage'),
        lastSeen: last,
      );
    }).toList()
      ..sort((a, b) => (b.lastSeen ?? DateTime(1970)).compareTo(a.lastSeen ?? DateTime(1970)));
  }
}

double? _num(dynamic v) {
  if (v is num) return v.toDouble();
  return double.tryParse(v?.toString() ?? '');
}

String mobilePerfRangeLabel(AdminTimeRange range) => range.label;
