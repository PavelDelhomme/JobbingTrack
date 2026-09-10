import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/theme_controller.dart';
import 'package:jobbingtrack_mobile/theme/theme_extensions.dart';

/// Bouton ☀️ / 🌙 aligné sur le login web (`toggleTheme`).
class ThemeLightDarkToggleButton extends StatelessWidget {
  final double size;
  final EdgeInsetsGeometry padding;

  const ThemeLightDarkToggleButton({
    super.key,
    this.size = 40,
    this.padding = const EdgeInsets.all(4),
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: padding,
      child: Tooltip(
        message: isDark ? 'Passer en mode clair' : 'Passer en mode sombre',
        child: Material(
          color: isDark ? context.cs.surfaceContainerHigh : context.cs.surface,
          shape: const CircleBorder(),
          elevation: 1,
          shadowColor: Colors.black.withValues(alpha: 0.18),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: () {
              ThemeController.instance.toggleLightDark(
                effectiveBrightness: Theme.of(context).brightness,
              );
            },
            child: SizedBox(
              width: size,
              height: size,
              child: Center(
                child: Text(
                  isDark ? '🌙' : '☀️',
                  style: TextStyle(fontSize: size * 0.42),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
