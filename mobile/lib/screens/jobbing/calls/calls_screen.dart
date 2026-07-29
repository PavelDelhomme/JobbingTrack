import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/application_provider.dart';
import 'package:jobbingtrack_mobile/models/call.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer_leading.dart';
import 'package:jobbingtrack_mobile/widgets/drawer_back_scope.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';
import 'package:jobbingtrack_mobile/utils/list_item_meta.dart';
import 'package:jobbingtrack_mobile/screens/jobbing/calls/call_detail_screen.dart';

class CallsScreen extends StatefulWidget {
  const CallsScreen({super.key});

  @override
  State<CallsScreen> createState() => _CallsScreenState();
}

class _CallsScreenState extends State<CallsScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  List<Call> _calls = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    setState(() => _loading = true);
    try {
      await Provider.of<ApplicationProvider>(context, listen: false)
          .loadApplications(token: auth.token);
      final list = await ApiService.getCalls(token: auth.token);
      if (mounted) {
        setState(() {
          _calls = list;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: AppDrawer(),
      appBar: AppBar(
        leading: const AppDrawerLeadingButton(),
        automaticallyImplyLeading: false,
        title: const Text('Appels'),
        centerTitle: true,
      ),
      body: DrawerBackScope(
        scaffoldKey: _scaffoldKey,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _calls.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.phone_in_talk, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text('Aucun appel', style: TextStyle(fontSize: 16, color: Colors.grey[600])),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      itemCount: _calls.length,
                      itemBuilder: (context, index) {
                        final c = _calls[index];
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
