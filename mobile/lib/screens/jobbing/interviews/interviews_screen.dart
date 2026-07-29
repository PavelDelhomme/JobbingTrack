import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/interview_provider.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/interviews/interview_detail_screen.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer_leading.dart';
import 'package:jobbingtrack_mobile/widgets/drawer_back_scope.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/list_item_meta.dart';
import 'package:jobbingtrack_mobile/widgets/interview_create_sheet.dart';

class InterviewsScreen extends StatefulWidget {
  const InterviewsScreen({super.key});

  @override
  State<InterviewsScreen> createState() => _InterviewsScreenState();
}

class _InterviewsScreenState extends State<InterviewsScreen> with SingleTickerProviderStateMixin {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      Provider.of<ApplicationProvider>(context, listen: false)
          .loadApplications(token: auth.token);
      Provider.of<InterviewProvider>(context, listen: false).loadInterviews(token: auth.token);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await Provider.of<InterviewProvider>(context, listen: false).loadInterviews(token: auth.token);
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<InterviewProvider>(context);

    return Scaffold(
      key: _scaffoldKey,
      drawer: AppDrawer(),
      appBar: AppBar(
        leading: const AppDrawerLeadingButton(),
        automaticallyImplyLeading: false,
        title: const Text('Entretiens'),
        centerTitle: true,
        actions: const [MobileNotificationCenter()],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.schedule), text: 'À venir'),
            Tab(icon: Icon(Icons.history), text: 'Passés'),
          ],
        ),
      ),
      body: DrawerBackScope(
        scaffoldKey: _scaffoldKey,
        child: provider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _reload,
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildList(provider.upcomingInterviews, upcoming: true),
                    _buildList(provider.pastInterviews, upcoming: false),
                  ],
                ),
              ),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'fab_interviews_list',
        tooltip: 'Nouvel entretien',
        onPressed: () async {
          final ok = await showCreateInterviewSheet(context);
          if (ok) _reload();
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildList(List<Interview> interviews, {required bool upcoming}) {
    if (interviews.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          Center(
            child: Column(
              children: [
                Icon(
                  upcoming ? Icons.event_available : Icons.history,
                  size: 64,
                  color: Colors.grey[400],
                ),
                const SizedBox(height: 16),
                Text(
                  upcoming ? 'Aucun entretien à venir' : 'Aucun entretien passé',
                  style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      itemCount: interviews.length,
      itemBuilder: (context, index) {
        final i = interviews[index];
        final apps = Provider.of<ApplicationProvider>(context, listen: false).applications;
        final offerLine = linkedOfferCompanyLine(
          applicationId: i.applicationId,
          position: i.applicationPosition,
          companyName: i.companyName,
          applications: apps,
        );
        final meta = joinListMeta([offerLine, i.location]);
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            title: Text(formatSmartEventDate(i.interviewDate)),
            subtitle: Text(
              meta.isNotEmpty ? meta : (i.notes ?? 'Entretien'),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            leading: Icon(
              Icons.calendar_today,
              color: upcoming ? Colors.orange : Colors.grey,
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => InterviewDetailScreen(interview: i)),
            ),
          ),
        );
      },
    );
  }
}
