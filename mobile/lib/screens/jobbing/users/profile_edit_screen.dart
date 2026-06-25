import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:jobbingtrack_mobile/providers/auth_provider.dart';

class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _firstNameCtrl;
  late final TextEditingController _lastNameCtrl;
  late final TextEditingController _phoneCtrl;
  late final String _currentEmail;

  bool _changeEmail = false;
  final _newEmailCtrl = TextEditingController();
  final _confirmEmailCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    final user = Provider.of<AuthProvider>(context, listen: false).user;
    _currentEmail = user?.email ?? '';
    _firstNameCtrl = TextEditingController(text: user?.firstName ?? '');
    _lastNameCtrl = TextEditingController(text: user?.lastName ?? '');
    _phoneCtrl = TextEditingController(text: user?.phone ?? '');
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _phoneCtrl.dispose();
    _newEmailCtrl.dispose();
    _confirmEmailCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);

    String? newEmail;
    if (_changeEmail) {
      newEmail = _newEmailCtrl.text.trim().toLowerCase();
      if (newEmail == _currentEmail.toLowerCase()) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('La nouvelle adresse est identique à l\'actuelle')),
        );
        return;
      }
    }

    try {
      await auth.updateProfile(
        firstName: _firstNameCtrl.text,
        lastName: _lastNameCtrl.text,
        phone: _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
        email: newEmail,
      );
      if (!mounted) return;

      if (newEmail != null && mounted) {
        await showDialog<void>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Vérifiez votre nouvel email'),
            content: Text(
              'Un lien de vérification a été envoyé à :\n\n$newEmail\n\n'
              'Votre ancienne adresse reste active jusqu\'à validation du lien.',
            ),
            actions: [
              FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('Compris')),
            ],
          ),
        );
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            newEmail != null ? 'Profil mis à jour — vérifiez votre boîte mail' : 'Profil mis à jour',
          ),
        ),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final emailVerified = auth.user?.emailVerified ?? true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Modifier le profil'),
        actions: [
          if (auth.isLoading)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
            )
          else
            TextButton(onPressed: _save, child: const Text('Enregistrer')),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              initialValue: _currentEmail,
              readOnly: true,
              decoration: InputDecoration(
                labelText: 'Email actuel',
                suffixIcon: emailVerified
                    ? Icon(Icons.verified, color: Colors.green.shade600, size: 20)
                    : Icon(Icons.warning_amber, color: Colors.orange.shade700, size: 20),
                helperText: emailVerified ? null : 'Email non vérifié — consultez votre boîte mail',
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Changer l\'adresse email'),
              subtitle: const Text('Un email de vérification sera envoyé à la nouvelle adresse'),
              value: _changeEmail,
              onChanged: (v) => setState(() {
                _changeEmail = v;
                if (!v) {
                  _newEmailCtrl.clear();
                  _confirmEmailCtrl.clear();
                }
              }),
            ),
            if (_changeEmail) ...[
              TextFormField(
                controller: _newEmailCtrl,
                decoration: const InputDecoration(
                  labelText: 'Nouvel email',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                enableSuggestions: false,
                textInputAction: TextInputAction.next,
                validator: (v) {
                  if (!_changeEmail) return null;
                  if (v == null || v.trim().isEmpty) return 'Saisissez la nouvelle adresse';
                  if (!RegExp(r'^[\w-\.+]+@([\w-]+\.)+[\w-]{2,}$').hasMatch(v.trim())) {
                    return 'Adresse email invalide';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _confirmEmailCtrl,
                decoration: const InputDecoration(
                  labelText: 'Confirmer le nouvel email',
                  helperText: 'Retapez l\'adresse pour éviter une erreur de frappe',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                enableSuggestions: false,
                textInputAction: TextInputAction.done,
                validator: (v) {
                  if (!_changeEmail) return null;
                  if (v == null || v.trim().isEmpty) return 'Confirmez la nouvelle adresse';
                  if (v.trim().toLowerCase() != _newEmailCtrl.text.trim().toLowerCase()) {
                    return 'Les deux adresses ne correspondent pas';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
            ],
            const Divider(height: 32),
            TextFormField(
              controller: _firstNameCtrl,
              decoration: const InputDecoration(labelText: 'Prénom'),
              textCapitalization: TextCapitalization.words,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Prénom requis' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _lastNameCtrl,
              decoration: const InputDecoration(labelText: 'Nom'),
              textCapitalization: TextCapitalization.words,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Nom requis' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phoneCtrl,
              decoration: const InputDecoration(labelText: 'Téléphone'),
              keyboardType: TextInputType.phone,
            ),
          ],
        ),
      ),
    );
  }
}
