import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/providers/call_provider.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer_leading.dart';
import 'package:jobbingtrack_mobile/widgets/drawer_back_scope.dart';
import 'package:jobbingtrack_mobile/widgets/call_create_sheet.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/list_item_meta.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/calls/call_detail_screen.dart';
import 'package:jobbingtrack_mobile/theme/theme_extensions.dart';

class CallsScreen extends StatefulWidget {
  const CallsScreen({super.key});

  @override
  State<CallsScreen> createState() => _CallsScreenState();
}

class _CallsScreenState extends State<CallsScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load({bool force = false}) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await Provider.of<ApplicationProvider>(context, listen: false)
        .loadApplications(token: auth.token);
    await Provider.of<CallProvider>(context, listen: false).loadCalls(
      token: auth.token,
      userId: auth.user?.id,
      force: force,
    );
  }

  @override
  Widget build(BuildContext context) {
    final callProvider = Provider.of<CallProvider>(context);
    final calls = callProvider.calls;

    return Scaffold(
      key: _scaffoldKey,
      drawer: AppDrawer(),
      floatingActionButton: FloatingActionButton(
        heroTag: 'fab_calls_screen',
        tooltip: 'Nouvel appel',
        onPressed: () async {
          final created = await showCreateCallSheet(context);
          if (created != null && mounted) await _load(force: true);
        },
        child: const Icon(Icons.phone_outlined),
      ),
      appBar: AppBar(
        leading: const AppDrawerLeadingButton(),
        automaticallyImplyLeading: false,
        title: const Text('Appels'),
        centerTitle: true,
      ),
      body: DrawerBackScope(
        scaffoldKey: _scaffoldKey,
        child: callProvider.isLoading && calls.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : calls.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.phone_in_talk, size: 64, color: context.textSecondary),
                        const SizedBox(height: 16),
                        Text('Aucun appel', style: TextStyle(fontSize: 16, color: context.textSecondary)),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: () => _load(force: true),
                    child: ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      itemCount: calls.length,
                      itemBuilder: (context, index) {
                        final c = calls[index];
                        final apps =
                            Provider.of<ApplicationProvider>(context, listen: false).applications;
                        final offerLine = linkedOfferCompanyLine(
                          applicationId: c.applicationId,
                          position: c.applicationPosition,
                          companyName: c.companyName,
                          applications: apps,
                        );
                        final meta = joinListMeta([
                          c.isCompanyOnly ? null : c.targetLabel,
                          offerLine.isNotEmpty ? offerLine : c.companyName,
                          formatSmartEventDate(c.callDate),
                        ]);
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: ListTile(
                            title: Text(
                              c.subject.trim().isNotEmpty ? c.subject : 'Appel téléphonique',
                            ),
                            subtitle: Text(meta, maxLines: 2, overflow: TextOverflow.ellipsis),
                            leading: const Icon(Icons.phone, color: Colors.green),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => CallDetailScreen(call: c)),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
      ),
    );
  }
}
