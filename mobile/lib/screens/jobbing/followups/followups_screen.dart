import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';
import 'package:jobbingtrack_mobile/providers/followup_provider.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/widgets/mobile_notification_center.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer.dart';
import 'package:jobbingtrack_mobile/widgets/app_drawer_leading.dart';
import 'package:jobbingtrack_mobile/widgets/drawer_back_scope.dart';
import 'package:jobbingtrack_mobile/utils/datetime_display.dart';

class FollowUpsScreen extends StatefulWidget {
  const FollowUpsScreen({super.key});

  @override
  State<FollowUpsScreen> createState() => _FollowUpsScreenState();
}

class _FollowUpsScreenState extends State<FollowUpsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      Provider.of<FollowUpProvider>(context, listen: false).loadFollowUps(token: auth.token);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadFollowUps() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await Provider.of<FollowUpProvider>(context, listen: false).loadFollowUps(token: auth.token);
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<FollowUpProvider>(context);

    return Scaffold(
      key: _scaffoldKey,
      drawer: AppDrawer(),
      appBar: AppBar(
        leading: const AppDrawerLeadingButton(),
        automaticallyImplyLeading: false,
        title: const Text('Mes Relances'),
        centerTitle: true,
        actions: [
          MobileNotificationCenter(),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(
              icon: Icon(Icons.schedule),
              text: 'À venir',
            ),
            Tab(
              icon: Icon(Icons.check_circle),
              text: 'Terminées',
            ),
          ],
        ),
      ),
      body: DrawerBackScope(
        scaffoldKey: _scaffoldKey,
        child: provider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _loadFollowUps,
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildFollowUpsList(provider.pendingFollowUps, isPending: true),
                    _buildFollowUpsList(provider.completedFollowUps, isPending: false),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildFollowUpsList(List<FollowUp> followUps, {required bool isPending}) {
    if (followUps.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isPending ? Icons.event_available : Icons.history,
              size: 80,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              isPending ? 'Aucune relance à venir' : 'Aucune relance terminée',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      itemCount: followUps.length,
      itemBuilder: (context, index) {
        final followUp = followUps[index];
        return _buildFollowUpCard(followUp, isPending);
      },
    );
  }

  Widget _buildFollowUpCard(FollowUp followUp, bool isPending) {
    final isOverdue = isPending && followUp.scheduledDate.isBefore(DateTime.now());

    Color typeColor = _getTypeColor(followUp.type);
    IconData typeIcon = _getTypeIcon(followUp.type);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isOverdue ? Colors.red[200]! : Colors.grey[200]!,
          width: isOverdue ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // En-tête
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: typeColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(typeIcon, color: typeColor, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _getTypeLabel(followUp.type),
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey[800],
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(
                            Icons.calendar_today,
                            size: 14,
                            color: isOverdue ? Colors.red[600] : Colors.grey[600],
                          ),
                          const SizedBox(width: 4),
                          Text(
                            formatSmartEventDate(followUp.scheduledDate),
                            style: TextStyle(
                              fontSize: 12,
                              color: isOverdue ? Colors.red[600] : Colors.grey[600],
                              fontWeight: isOverdue ? FontWeight.w600 : FontWeight.normal,
                            ),
                          ),
                          if (isOverdue) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.red[50],
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'EN RETARD',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.red[700],
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                if (isPending)
                  PopupMenuButton(
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'complete',
                        child: Row(
                          children: [
                            Icon(Icons.check_circle, color: Colors.green),
                            SizedBox(width: 8),
                            Text('Marquer comme terminée'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'edit',
                        child: Row(
                          children: [
                            Icon(Icons.edit, color: Colors.blue),
                            SizedBox(width: 8),
                            Text('Modifier'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Supprimer'),
                          ],
                        ),
                      ),
                    ],
                    onSelected: (value) {
                      switch (value) {
                        case 'complete':
                          _showCompleteDialog(followUp);
                          break;
                        case 'edit':
                          // TODO: Implement edit
                          break;
                        case 'delete':
                          _deleteFollowUp(followUp.id);
                          break;
                      }
                    },
                  ),
              ],
            ),

            if (followUp.notes != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  followUp.notes!,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[700],
                  ),
                ),
              ),
            ],

            if (!isPending && followUp.response != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green[200]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.check_circle, 
                            color: Colors.green[700], 
                            size: 16),
                        const SizedBox(width: 4),
                        Text(
                          'Réponse :',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.green[700],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      followUp.response!,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[700],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'EMAIL':
        return Colors.blue;
      case 'PHONE':
        return Colors.green;
      case 'IN_PERSON':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'EMAIL':
        return Icons.email;
      case 'PHONE':
        return Icons.phone;
      case 'IN_PERSON':
        return Icons.person;
      default:
        return Icons.schedule_send;
    }
  }

  String _getTypeLabel(String type) {
    switch (type) {
      case 'EMAIL':
        return 'Relance par email';
      case 'PHONE':
        return 'Relance téléphonique';
      case 'IN_PERSON':
        return 'Relance en personne';
      default:
        if (type.length > 20 || type.contains('-')) return 'Relance';
        return type;
    }
  }

  Future<void> _showCompleteDialog(FollowUp followUp) async {
    final responseController = TextEditingController();

    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Marquer comme terminée'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Quelle a été la réponse ?'),
            const SizedBox(height: 16),
            TextField(
              controller: responseController,
              decoration: const InputDecoration(
                labelText: 'Réponse',
                hintText: 'Ex: Entretien confirmé pour le...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop(responseController.text);
            },
            child: const Text('Valider'),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty && mounted) {
      final provider = Provider.of<FollowUpProvider>(context, listen: false);
      final auth = Provider.of<AuthProvider>(context, listen: false);
      await provider.markAsCompleted(followUp.id, result, token: auth.token);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Relance marquée comme terminée'),
            backgroundColor: Colors.green,
          ),
        );
      }
    }
  }

  Future<void> _deleteFollowUp(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer la relance'),
        content: const Text('Êtes-vous sûr de vouloir supprimer cette relance ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final provider = Provider.of<FollowUpProvider>(context, listen: false);
      final auth = Provider.of<AuthProvider>(context, listen: false);
      await provider.deleteFollowUp(id, token: auth.token);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Relance supprimée'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

