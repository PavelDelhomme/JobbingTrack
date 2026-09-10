import 'package:flutter/material.dart';

/// Helpers thème JobbingTrack — toujours préférer ces tokens aux `Colors.grey` /
/// `Colors.white` hardcodés (aligné web dark: gray-950 / 900 / 800 / 100).
extension AppThemeContext on BuildContext {
  ColorScheme get cs => Theme.of(this).colorScheme;
  TextTheme get tt => Theme.of(this).textTheme;
  bool get isDark => Theme.of(this).brightness == Brightness.dark;

  TextStyle? get sectionTitleStyle =>
      tt.titleMedium?.copyWith(fontWeight: FontWeight.w600, color: cs.onSurface);

  TextStyle? get mutedStyle =>
      tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant);

  TextStyle? get captionMuted =>
      tt.bodySmall?.copyWith(color: cs.onSurfaceVariant);

  /// Fond de carte / panneau formulaire (web: `dark:bg-gray-800` / `gray-900`).
  Color get panelColor => cs.surfaceContainer;

  /// Fond champ saisie (thème InputDecoration, sinon surface haute).
  Color get fieldFillColor =>
      Theme.of(this).inputDecorationTheme.fillColor ?? cs.surfaceContainerHigh;

  /// Surface douce type pastille / bandeau (web: gray-100 clair / gray-800 sombre).
  Color get softSurface =>
      isDark ? cs.surfaceContainerHigh : cs.surfaceContainerLow;

  /// Accent primary soft (web: blue-50 / primaryContainer).
  Color get softPrimary =>
      cs.primaryContainer.withValues(alpha: isDark ? 0.55 : 1);

  Color get textPrimary => cs.onSurface;
  Color get textSecondary => cs.onSurfaceVariant;
  Color get borderSubtle =>
      cs.outlineVariant.withValues(alpha: isDark ? 0.7 : 0.9);
}
