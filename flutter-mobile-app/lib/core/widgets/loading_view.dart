import 'package:flutter/material.dart';
import 'package:jobbingtrack_flutter/core/theme/app_colors.dart';

class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.color = AppColors.primary});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Center(child: CircularProgressIndicator(color: color));
  }
}
