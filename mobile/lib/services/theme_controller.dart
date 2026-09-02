import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';

/// Thème clair / sombre / système — persisté localement.
class ThemeController extends ChangeNotifier {
  ThemeController._();
  static final ThemeController instance = ThemeController._();

  ThemeMode _mode = ThemeMode.system;
  bool _loaded = false;

  ThemeMode get mode => _mode;
  bool get isLoaded => _loaded;

  Future<void> load() async {
    final raw = await ApiConfigStore.loadThemeMode();
    _mode = _parse(raw);
    _loaded = true;
    notifyListeners();
  }

  Future<void> setMode(ThemeMode mode) async {
    if (_mode == mode) return;
    _mode = mode;
    await ApiConfigStore.saveThemeMode(_serialize(mode));
    notifyListeners();
  }

  static ThemeMode _parse(String raw) {
    switch (raw) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  static String _serialize(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }

  static String label(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'Clair';
      case ThemeMode.dark:
        return 'Sombre';
      case ThemeMode.system:
        return 'Système';
    }
  }
}
