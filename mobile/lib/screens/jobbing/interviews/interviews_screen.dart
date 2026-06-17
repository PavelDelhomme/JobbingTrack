import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/interview_provider.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer.dart';
import 'package:jobbingtrack_mobile/widgets/drawer_back_scope.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';

class InterviewsScreen extends StatefulWidget {
  const InterviewsScreen({super.key});

  @override
  State<InterviewsScreen> createState() => _InterviewsScreenState();
}

class _InterviewsScreenState extends State<InterviewsScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      Provider.of<InterviewProvider>(context, listen: false).loadInterviews(token: auth.token);
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<InterviewProvider>(context);

    return Scaffold(
      key: _scaffoldKey,
      drawer: AppDrawer(),
      appBar: AppBar(
        title: const Text('Entretiens'),
        centerTitle: true,
      ),
      body: DrawerBackScope(
        scaffoldKey: _scaffoldKey,
        child: provider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : provider.interviews.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.event_busy, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text('Aucun entretien', style: TextStyle(fontSize: 16, color: Colors.grey[600])),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: provider.interviews.length,
                    itemBuilder: (context, index) {
                      final i = provider.interviews[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          title: Text(formatSmartEventDate(i.interviewDate)),
                          subtitle: Text(i.location ?? i.notes ?? 'Entretien'),
                          leading: const Icon(Icons.calendar_today, color: Colors.blue),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}