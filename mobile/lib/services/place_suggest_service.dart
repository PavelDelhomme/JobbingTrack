import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

/// Suggestion d'adresse / lieu (Nominatim OpenStreetMap, FR).
class PlaceSuggestion {
  const PlaceSuggestion({
    required this.id,
    required this.label,
    this.subtitle,
  });

  final String id;
  final String label;
  final String? subtitle;
}

/// Recherche lieux pour autocomplete (même approche que GasoilTracking).
class PlaceSuggestService {
  PlaceSuggestService._();

  static const _userAgent = 'JobbingTrack-Mobile/1.0 (personal job tracker)';
  static Timer? _debounce;
  static int _seq = 0;

  /// Debounce + annulation des réponses obsolètes.
  static Future<List<PlaceSuggestion>> searchDebounced(
    String query, {
    Duration delay = const Duration(milliseconds: 350),
    int limit = 6,
  }) {
    final completer = Completer<List<PlaceSuggestion>>();
    final mySeq = ++_seq;
    _debounce?.cancel();
    _debounce = Timer(delay, () async {
      try {
        final hits = await search(query, limit: limit);
        if (mySeq != _seq) {
          if (!completer.isCompleted) completer.complete([]);
          return;
        }
        if (!completer.isCompleted) completer.complete(hits);
      } catch (_) {
        if (!completer.isCompleted) completer.complete([]);
      }
    });
    return completer.future;
  }

  static Future<List<PlaceSuggestion>> search(String query, {int limit = 6}) async {
    final q = query.trim();
    if (q.length < 3) return [];
    final uri = Uri.parse(
      'https://nominatim.openstreetmap.org/search'
      '?format=jsonv2'
      '&q=${Uri.encodeQueryComponent(q)}'
      '&limit=$limit'
      '&addressdetails=1'
      '&countrycodes=fr',
    );
    final res = await http
        .get(uri, headers: {'Accept': 'application/json', 'User-Agent': _userAgent})
        .timeout(const Duration(seconds: 8));
    if (res.statusCode != 200) return [];
    final data = jsonDecode(res.body);
    if (data is! List) return [];
    final out = <PlaceSuggestion>[];
    for (final raw in data) {
      if (raw is! Map) continue;
      final display = raw['display_name']?.toString() ?? '';
      final name = raw['name']?.toString() ?? '';
      final address = raw['address'];
      String label = name;
      if (address is Map) {
        final road = (address['road'] ?? address['pedestrian'] ?? address['residential'])?.toString();
        final city = (address['city'] ??
                address['town'] ??
                address['village'] ??
                address['municipality'])
            ?.toString();
        if (road != null && road.isNotEmpty && city != null && city.isNotEmpty) {
          label = '$road, $city';
        } else if (city != null && city.isNotEmpty) {
          label = city;
        }
      }
      if (label.isEmpty) {
        label = display.split(',').take(3).join(',').trim();
      }
      if (label.isEmpty) continue;
      final id = 'geo-${raw['place_id'] ?? '${raw['lat']},${raw['lon']}'}';
      out.add(PlaceSuggestion(
        id: id,
        label: label,
        subtitle: display.isNotEmpty && display != label ? display : null,
      ));
    }
    return out;
  }
}
