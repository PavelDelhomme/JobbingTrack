import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/utils/admin_time_range.dart';

class AdminTimeRangeBar extends StatelessWidget {
  final AdminTimeRange value;
  final ValueChanged<AdminTimeRange> onChanged;

  const AdminTimeRangeBar({super.key, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: AdminTimeRange.values.map((r) {
          final selected = r == value;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(r.label),
              selected: selected,
              onSelected: (_) => onChanged(r),
            ),
          );
        }).toList(),
      ),
    );
  }
}
