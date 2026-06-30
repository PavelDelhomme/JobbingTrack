/// Plages temporelles admin (alignées backoffice web).
enum AdminTimeRange {
  h24('24h', Duration(hours: 24)),
  d7('7 j', Duration(days: 7)),
  d30('30 j', Duration(days: 30));

  const AdminTimeRange(this.label, this.duration);
  final String label;
  final Duration duration;

  ({DateTime start, DateTime end}) bounds([DateTime? endAt]) {
    final end = endAt ?? DateTime.now();
    return (start: end.subtract(duration), end: end);
  }

  String queryString([DateTime? endAt]) {
    final b = bounds(endAt);
    return 'startDate=${Uri.encodeComponent(b.start.toUtc().toIso8601String())}'
        '&endDate=${Uri.encodeComponent(b.end.toUtc().toIso8601String())}';
  }

  String statisticsTimeRange() {
    switch (this) {
      case AdminTimeRange.h24:
        return '24h';
      case AdminTimeRange.d7:
        return '7d';
      case AdminTimeRange.d30:
        return '30d';
    }
  }
}
