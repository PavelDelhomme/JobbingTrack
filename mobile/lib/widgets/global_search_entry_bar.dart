import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/global_search.dart';
import 'package:jobbingtrack_mobile/theme/theme_extensions.dart';

/// Barre de recherche globale (accueil, listes…) — ouvre l'écran de recherche unifié.
class GlobalSearchEntryBar extends StatelessWidget {
  final EdgeInsetsGeometry? margin;

  const GlobalSearchEntryBar({super.key, this.margin});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: margin ?? EdgeInsets.zero,
      child: Material(
        color: context.softSurface,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: () => openGlobalSearch(context),
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: [
                Icon(Icons.search, color: context.textSecondary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Rechercher candidatures, entreprises, contacts…',
                    style: TextStyle(
                      color: context.textSecondary,
                      fontSize: 15,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

IconButton globalSearchIconButton(BuildContext context) {
  return IconButton(
    tooltip: 'Recherche globale',
    onPressed: () => openGlobalSearch(context),
    icon: const Icon(Icons.search),
  );
}
