import 'package:flutter/material.dart';

/// Thèmes Material 3 JobbingTrack — clair / sombre modernes (alignés web #3B82F6).
abstract final class AppTheme {
  static const Color _seed = Color(0xFF3B82F6);

  static ThemeData light() => _build(Brightness.light);

  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final base = ColorScheme.fromSeed(
      seedColor: _seed,
      brightness: brightness,
      dynamicSchemeVariant: DynamicSchemeVariant.fidelity,
    );

    final scheme = isDark
        ? base.copyWith(
            surface: const Color(0xFF121820),
            surfaceContainerLowest: const Color(0xFF0B0F14),
            surfaceContainerLow: const Color(0xFF141B26),
            surfaceContainer: const Color(0xFF1A2230),
            surfaceContainerHigh: const Color(0xFF232D3F),
            surfaceContainerHighest: const Color(0xFF2A3548),
            onSurface: const Color(0xFFE8EDF4),
            onSurfaceVariant: const Color(0xFF94A3B8),
            outline: const Color(0xFF3D4F66),
            outlineVariant: const Color(0xFF2A3548),
            primary: const Color(0xFF60A5FA),
            onPrimary: const Color(0xFF0B1220),
            primaryContainer: const Color(0xFF1E3A5F),
            onPrimaryContainer: const Color(0xFFD6E8FF),
            secondaryContainer: const Color(0xFF243044),
            onSecondaryContainer: const Color(0xFFD0DAEA),
            tertiaryContainer: const Color(0xFF3D3200),
            onTertiaryContainer: const Color(0xFFFFE7A3),
            error: const Color(0xFFF87171),
            onError: const Color(0xFF1A0505),
            errorContainer: const Color(0xFF4A1515),
            onErrorContainer: const Color(0xFFFFDAD6),
          )
        : base.copyWith(
            surface: Colors.white,
            surfaceContainerLowest: const Color(0xFFF4F7FB),
            surfaceContainerLow: const Color(0xFFEEF2F8),
            surfaceContainer: const Color(0xFFE8EDF4),
            onSurface: const Color(0xFF0F172A),
            onSurfaceVariant: const Color(0xFF64748B),
            outline: const Color(0xFFCBD5E1),
            primary: const Color(0xFF2563EB),
            primaryContainer: const Color(0xFFDBEAFE),
            onPrimaryContainer: const Color(0xFF1E3A8A),
          );

    final radius = BorderRadius.circular(14);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor:
          isDark ? scheme.surfaceContainerLowest : scheme.surfaceContainerLowest,
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: true,
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        surfaceTintColor: scheme.surfaceTint,
      ),
      drawerTheme: DrawerThemeData(
        backgroundColor: scheme.surface,
        surfaceTintColor: scheme.surfaceTint,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.horizontal(right: Radius.circular(20)),
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: scheme.surfaceContainer,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: radius,
          side: BorderSide(color: scheme.outlineVariant.withValues(alpha: isDark ? 0.6 : 0.9)),
        ),
        margin: EdgeInsets.zero,
      ),
      listTileTheme: ListTileThemeData(
        iconColor: scheme.onSurfaceVariant,
        textColor: scheme.onSurface,
        selectedTileColor: scheme.primaryContainer.withValues(alpha: isDark ? 0.45 : 0.55),
        selectedColor: scheme.primary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      dividerTheme: DividerThemeData(
        color: scheme.outlineVariant.withValues(alpha: 0.55),
        thickness: 1,
        space: 1,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: scheme.surfaceContainerHigh,
        labelStyle: TextStyle(color: scheme.onSurface, fontSize: 13),
        side: BorderSide(color: scheme.outline.withValues(alpha: 0.5)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? scheme.surfaceContainerHigh : scheme.surface,
        border: OutlineInputBorder(borderRadius: radius),
        enabledBorder: OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: scheme.outline.withValues(alpha: 0.7)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: scheme.primary, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: radius),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          shape: RoundedRectangleBorder(borderRadius: radius),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: scheme.primary,
        foregroundColor: scheme.onPrimary,
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        type: BottomNavigationBarType.fixed,
        backgroundColor: scheme.surface,
        selectedItemColor: scheme.primary,
        unselectedItemColor: scheme.onSurfaceVariant,
        elevation: 8,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: isDark ? scheme.surfaceContainerHighest : scheme.inverseSurface,
        contentTextStyle: TextStyle(color: isDark ? scheme.onSurface : scheme.onInverseSurface),
        shape: RoundedRectangleBorder(borderRadius: radius),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: scheme.surfaceContainerHigh,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surfaceContainerHigh,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: scheme.primary),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return scheme.onPrimary;
          return scheme.outline;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return scheme.primary;
          return scheme.surfaceContainerHighest;
        }),
      ),
      textTheme: _textTheme(scheme, isDark),
    );
  }

  static TextTheme _textTheme(ColorScheme scheme, bool isDark) {
    final base = isDark ? Typography.material2021(platform: TargetPlatform.android).white : Typography.material2021(platform: TargetPlatform.android).black;
    return base.copyWith(
      titleLarge: base.titleLarge?.copyWith(fontWeight: FontWeight.w700, color: scheme.onSurface),
      titleMedium: base.titleMedium?.copyWith(fontWeight: FontWeight.w600, color: scheme.onSurface),
      bodyMedium: base.bodyMedium?.copyWith(color: scheme.onSurface, height: 1.45),
      bodySmall: base.bodySmall?.copyWith(color: scheme.onSurfaceVariant, height: 1.4),
      labelSmall: base.labelSmall?.copyWith(
        letterSpacing: 0.8,
        fontWeight: FontWeight.w700,
        color: scheme.onSurfaceVariant,
      ),
    );
  }
}
