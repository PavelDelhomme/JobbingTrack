import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:jobbingtrack_flutter/app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(const JobbingTrackApp());
}
