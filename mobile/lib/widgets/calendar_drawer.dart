import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';

/// Drawer dédié à l'onglet Calendrier (filtres + mode d'affichage).
class CalendarDrawer extends StatefulWidget {
  final CalendarViewMode viewMode;
  final CalendarFilters filters;
  final ValueChanged<CalendarViewMode> onViewModeChanged;
  final ValueChanged<CalendarFilters> onFiltersChanged;

  const CalendarDrawer({
    super.key,
    required this.viewMode,
    required this.filters,
    required this.onViewModeChanged,
    required this.onFiltersChanged,
  });

  @override
  State<CalendarDrawer> createState() => _CalendarDrawerState();
}

enum CalendarViewMode { planner, list }

class CalendarFilters {
  final bool showInterviews;
  final bool showFollowups;
  final bool showEvents;
  final bool showInterim;

  const CalendarFilters({
    this.showInterviews = true,
    this.showFollowups = true,
    this.showEvents = true,
    this.showInterim = true,
  });

  CalendarFilters copyWith({
    bool? showInterviews,
    bool? showFollowups,
    bool? showEvents,
    bool? showInterim,
  }) {
    return CalendarFilters(
      showInterviews: showInterviews ?? this.showInterviews,
      showFollowups: showFollowups ?? this.showFollowups,
      showEvents: showEvents ?? this.showEvents,
      showInterim: showInterim ?? this.showInterim,
    );
  }
}

class _CalendarDrawerState extends State<CalendarDrawer> {
  late CalendarViewMode _viewMode;
  late CalendarFilters _filters;

  @override
  void initState() {
    super.initState();
    _viewMode = widget.viewMode;
    _filters = widget.filters;
  }

  @override
  void didUpdateWidget(CalendarDrawer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.viewMode != widget.viewMode) _viewMode = widget.viewMode;
    if (oldWidget.filters != widget.filters) _filters = widget.filters;
  }

  Future<void> _persist() async {
    await ApiConfigStore.saveCalendarViewMode(_viewMode.name);
    await ApiConfigStore.saveCalendarFilters(
      showInterviews: _filters.showInterviews,
      showFollowups: _filters.showFollowups,
      showEvents: _filters.showEvents,
      showInterim: _filters.showInterim,
    );
    widget.onViewModeChanged(_viewMode);
    widget.onFiltersChanged(_filters);
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.indigo.shade700, Colors.blue.shade500],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: const Align(
              alignment: Alignment.bottomLeft,
              child: Text(
                'Calendrier',
                style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Text(
              'AFFICHAGE',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.5),
            ),
          ),
          RadioListTile<CalendarViewMode>(
            title: const Text('Planning'),
            subtitle: const Text('Vue semaine / jour (par défaut)'),
            value: CalendarViewMode.planner,
            groupValue: _viewMode,
            onChanged: (v) async {
              if (v == null) return;
              setState(() => _viewMode = v);
              await _persist();
              if (context.mounted) Navigator.pop(context);
            },
          ),
          RadioListTile<CalendarViewMode>(
            title: const Text('Liste'),
            subtitle: const Text('Événements & rappels'),
            value: CalendarViewMode.list,
            groupValue: _viewMode,
            onChanged: (v) async {
              if (v == null) return;
              setState(() => _viewMode = v);
              await _persist();
              if (context.mounted) Navigator.pop(context);
            },
          ),
          const Divider(),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Text(
              'TYPES À AFFICHER',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.5),
            ),
          ),
          SwitchListTile(
            title: const Text('Entretiens'),
            value: _filters.showInterviews,
            onChanged: (v) async {
              setState(() => _filters = _filters.copyWith(showInterviews: v));
              await _persist();
            },
          ),
          SwitchListTile(
            title: const Text('Relances'),
            value: _filters.showFollowups,
            onChanged: (v) async {
              setState(() => _filters = _filters.copyWith(showFollowups: v));
              await _persist();
            },
          ),
          SwitchListTile(
            title: const Text('Événements'),
            value: _filters.showEvents,
            onChanged: (v) async {
              setState(() => _filters = _filters.copyWith(showEvents: v));
              await _persist();
            },
          ),
          SwitchListTile(
            title: const Text('Intérim'),
            subtitle: const Text('Couleur ambre'),
            value: _filters.showInterim,
            onChanged: (v) async {
              setState(() => _filters = _filters.copyWith(showInterim: v));
              await _persist();
            },
          ),
        ],
      ),
    );
  }
}
