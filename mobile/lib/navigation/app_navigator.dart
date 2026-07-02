import 'package:flutter/material.dart';

/// Navigator racine — navigation fiable après déconnexion (drawer / dialog).
final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

/// Snackbars globales (retour Accueil, impersonnalisation, etc.).
final GlobalKey<ScaffoldMessengerState> rootScaffoldMessengerKey =
    GlobalKey<ScaffoldMessengerState>();
