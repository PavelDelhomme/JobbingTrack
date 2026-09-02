import 'package:flutter/material.dart';

extension AppThemeContext on BuildContext {
  ColorScheme get cs => Theme.of(this).colorScheme;
  TextTheme get tt => Theme.of(this).textTheme;

  TextStyle? get sectionTitleStyle =>
      tt.titleMedium?.copyWith(fontWeight: FontWeight.w600, color: cs.onSurface);

  TextStyle? get mutedStyle => tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant);

  TextStyle? get captionMuted => tt.bodySmall?.copyWith(color: cs.onSurfaceVariant);
}
