import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/crash_reporter.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/company_provider.dart';
import 'package:jobbingtrack_mobile/providers/contact_provider.dart';
import 'package:jobbingtrack_mobile/providers/interview_provider.dart';
import 'package:jobbingtrack_mobile/providers/notification_provider.dart';
import 'package:jobbingtrack_mobile/providers/followup_provider.dart';
import 'package:jobbingtrack_mobile/screens/login_screen.dart';
import 'package:jobbingtrack_mobile/screens/register_screen.dart';
import 'package:jobbingtrack_mobile/screens/home_screen.dart';
import 'package:jobbingtrack_mobile/screens/applications_screen.dart';
import 'package:jobbingtrack_mobile/screens/application_form_screen.dart';
import 'package:jobbingtrack_mobile/screens/companies_screen.dart';
import 'package:jobbingtrack_mobile/screens/contacts_screen.dart';
import 'package:jobbingtrack_mobile/screens/interviews_screen.dart';
import 'package:jobbingtrack_mobile/screens/profile_screen.dart';
import 'package:jobbingtrack_mobile/screens/settings_screen.dart';
import 'package:jobbingtrack_mobile/screens/analytics_screen.dart';
import 'package:jobbingtrack_mobile/screens/logs_screen.dart';
import 'package:jobbingtrack_mobile/screens/search_screen.dart';
import 'package:jobbingtrack_mobile/screens/statistics_screen.dart';
import 'package:jobbingtrack_mobile/screens/test_data_screen.dart';
import 'package:jobbingtrack_mobile/screens/trash_screen.dart';
import 'package:jobbingtrack_mobile/screens/users_screen.dart';
import 'package:jobbingtrack_mobile/screens/followups_screen.dart';
import 'package:jobbingtrack_mobile/screens/calls_screen.dart';
import 'package:jobbingtrack_mobile/screens/events_screen.dart';
import 'package:jobbingtrack_mobile/screens/forgot_password_screen.dart';
import 'package:jobbingtrack_mobile/screens/reset_password_screen.dart';
import 'package:jobbingtrack_mobile/screens/verify_email_screen.dart';
import 'package:jobbingtrack_mobile/screens/admin_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  CrashReporter.initialize();
  debugPrint('[APP] Démarrage JobbingTrack Mobile');

  runApp(const JobbingTrackMobileApp());
}

class JobbingTrackMobileApp extends StatelessWidget {
  const JobbingTrackMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ApplicationProvider()),
        ChangeNotifierProvider(create: (_) => CompanyProvider()),
        ChangeNotifierProvider(create: (_) => ContactProvider()),
        ChangeNotifierProvider(create: (_) => InterviewProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ChangeNotifierProvider(create: (_) => FollowUpProvider()),
      ],
      child: MaterialApp(
        title: 'JobbingTrack Mobile',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
          fontFamily: 'Inter',
        ),
        home: const _SplashScreen(),
        onGenerateRoute: (settings) {
          // /reset-password/:token
          if (settings.name != null && settings.name!.startsWith('/reset-password/')) {
            final token = settings.name!.replaceFirst('/reset-password/', '');
            return MaterialPageRoute(
              builder: (context) => ResetPasswordScreen(token: token),
              settings: settings,
            );
          }
          // /verify-email ou /verify-email/:token
          if (settings.name != null && settings.name!.startsWith('/verify-email')) {
            String? token;
            if (settings.name!.length > '/verify-email/'.length && settings.name!.startsWith('/verify-email/')) {
              token = settings.name!.substring('/verify-email/'.length);
            }
            return MaterialPageRoute(
              builder: (context) => VerifyEmailScreen(token: token),
              settings: settings,
            );
          }
          return null;
        },
        routes: {
          '/login': (context) => const LoginScreen(),
          '/register': (context) => const RegisterScreen(),
          '/forgot-password': (context) => const ForgotPasswordScreen(),
          '/home': (context) => const HomeScreen(),
          '/applications': (context) => const ApplicationsScreen(),
          '/application-form': (context) => const ApplicationFormScreen(),
          '/companies': (context) => const CompaniesScreen(),
          '/contacts': (context) => const ContactsScreen(),
          '/interviews': (context) => const InterviewsScreen(),
          '/profile': (context) => const ProfileScreen(),
          '/settings': (context) => const SettingsScreen(),
          '/analytics': (context) => const AnalyticsScreen(),
          '/logs': (context) => const LogsScreen(),
          '/search': (context) => const SearchScreen(),
          '/statistics': (context) => const StatisticsScreen(),
          '/test-data': (context) => const TestDataScreen(),
          '/trash': (context) => const TrashScreen(),
          '/users': (context) => const UsersScreen(),
          '/followups': (context) => const FollowUpsScreen(),
          '/calls': (context) => const CallsScreen(),
          '/events': (context) => const EventsScreen(),
          '/admin': (context) => const AdminScreen(),
        },
      ),
    );
  }
}

class _SplashScreen extends StatefulWidget {
  const _SplashScreen();

  @override
  State<_SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<_SplashScreen> {
  String _status = 'Connexion au serveur...';
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    debugPrint('[SPLASH] Détection API...');
    final ok = await ApiService.autoDetectApi();
    debugPrint('[SPLASH] API détectée: $ok -> ${ApiService.baseUrl}');
    if (ok && mounted) {
      Navigator.of(context).pushReplacementNamed('/login');
    } else if (mounted) {
      setState(() {
        _status = 'Serveur introuvable.\nVérifiez que adb reverse est actif\nou saisissez l\'IP manuellement.';
        _failed = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.track_changes, size: 64, color: Colors.blue[600]),
              const SizedBox(height: 16),
              Text('JobbingTrack', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.blue[800])),
              const SizedBox(height: 24),
              if (!_failed) const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(_status, textAlign: TextAlign.center, style: TextStyle(color: Colors.grey[600])),
              if (_failed) ...[
                const SizedBox(height: 24),
                _IpInput(onConnect: (url) {
                  ApiService.baseUrl = url;
                  setState(() { _status = 'Connexion...'; _failed = false; });
                  _init();
                }),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () {
                    setState(() { _status = 'Nouvelle tentative...'; _failed = false; });
                    _init();
                  },
                  child: const Text('Réessayer la détection automatique'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => Navigator.of(context).pushReplacementNamed('/login'),
                  child: const Text('Continuer sans vérification'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _IpInput extends StatefulWidget {
  final void Function(String url) onConnect;
  const _IpInput({required this.onConnect});

  @override
  State<_IpInput> createState() => _IpInputState();
}

class _IpInputState extends State<_IpInput> {
  final _ctrl = TextEditingController(text: '192.168.');

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _ctrl,
            decoration: InputDecoration(
              labelText: 'IP du PC (ex: 192.168.1.42)',
              prefixText: 'http://',
              suffixText: ':5002',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              isDense: true,
            ),
            keyboardType: TextInputType.number,
          ),
        ),
        const SizedBox(width: 8),
        ElevatedButton(
          onPressed: () => widget.onConnect('http://${_ctrl.text.trim()}:5002'),
          child: const Text('Connecter'),
        ),
      ],
    );
  }
}
