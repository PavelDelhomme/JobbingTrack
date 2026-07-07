import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/shell_data_refresh_service.dart';

/// Observer partagé pour détecter le retour sur un écran liste du shell.
final RouteObserver<ModalRoute<void>> shellListRouteObserver = RouteObserver<ModalRoute<void>>();

/// Appelé quand une route empilée au-dessus du shell est fermée (retour arrière).
mixin ShellListRefreshMixin<T extends StatefulWidget> on State<T>, RouteAware {
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route != null) {
      shellListRouteObserver.subscribe(this, route);
    }
  }

  @override
  void dispose() {
    shellListRouteObserver.unsubscribe(this);
    super.dispose();
  }

  @override
  void didPopNext() {
    onShellListVisibleAgain();
  }

  /// Surcharger pour recharger la liste locale ; par défaut refresh providers partagés.
  void onShellListVisibleAgain() {
    ShellDataRefreshService.refreshIfStale(context: context, force: true);
  }
}
