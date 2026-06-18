import 'dart:convert';
import 'dart:io';

import 'package:call_log/call_log.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_contacts/flutter_contacts.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Données téléphone stockées **uniquement en local** (SharedPreferences).
class LocalPhoneIntegrationsService {
  static const _callLogKey = 'local_phone_call_log_v1';
  static const _contactsKey = 'local_phone_contacts_v1';
  static const _callLogSyncedAtKey = 'local_phone_call_log_synced_at';
  static const _contactsSyncedAtKey = 'local_phone_contacts_synced_at';

  static Future<bool> requestCallLogPermission() async {
    if (!Platform.isAndroid) return false;
    final status = await Permission.phone.request();
    return status.isGranted;
  }

  static Future<bool> requestContactsPermission() async {
    final status = await Permission.contacts.request();
    return status.isGranted;
  }

  static Future<int> syncCallLogLocally({int daysBack = 30}) async {
    if (!Platform.isAndroid) return 0;
    if (!await requestCallLogPermission()) {
      throw Exception('Permission journal d\'appels refusée');
    }
    final since = DateTime.now().subtract(Duration(days: daysBack)).millisecondsSinceEpoch;
    final entries = await CallLog.query(dateFrom: since, dateTo: DateTime.now().millisecondsSinceEpoch);
    final serialized = entries.map((e) {
      return {
        'number': e.number ?? '',
        'name': e.name ?? '',
        'timestamp': e.timestamp ?? 0,
        'duration': e.duration ?? 0,
        'callType': e.callType?.index ?? 0,
      };
    }).toList();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_callLogKey, jsonEncode(serialized));
    await prefs.setString(_callLogSyncedAtKey, DateTime.now().toIso8601String());
    return serialized.length;
  }

  static Future<int> getLocalCallLogCount() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_callLogKey);
    if (raw == null || raw.isEmpty) return 0;
    try {
      return (jsonDecode(raw) as List).length;
    } catch (_) {
      return 0;
    }
  }

  static Future<DateTime?> getCallLogSyncedAt() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_callLogSyncedAtKey);
    if (raw == null) return null;
    return DateTime.tryParse(raw);
  }

  static Future<int> syncPhoneContactsLocally() async {
    if (!await requestContactsPermission()) {
      throw Exception('Permission contacts refusée');
    }
    final contacts = await FlutterContacts.getContacts(withProperties: true);
    final serialized = contacts.map((c) {
      final phone = c.phones.isNotEmpty ? c.phones.first.number : '';
      final email = c.emails.isNotEmpty ? c.emails.first.address : '';
      return {
        'id': c.id,
        'displayName': c.displayName,
        'firstName': c.name.first,
        'lastName': c.name.last,
        'phone': phone,
        'email': email,
      };
    }).where((m) => (m['displayName'] as String).trim().isNotEmpty).toList();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_contactsKey, jsonEncode(serialized));
    await prefs.setString(_contactsSyncedAtKey, DateTime.now().toIso8601String());
    return serialized.length;
  }

  static Future<List<Map<String, dynamic>>> getLocalPhoneContacts({String query = ''}) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_contactsKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = (jsonDecode(raw) as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      if (query.trim().isEmpty) return list;
      final q = query.toLowerCase();
      return list.where((c) {
        final name = '${c['displayName'] ?? ''} ${c['phone'] ?? ''}'.toLowerCase();
        return name.contains(q);
      }).toList();
    } catch (e) {
      debugPrint('[LocalPhoneIntegrations] parse contacts: $e');
      return [];
    }
  }

  static Future<int> getLocalPhoneContactsCount() async {
    return (await getLocalPhoneContacts()).length;
  }

  static Future<DateTime?> getContactsSyncedAt() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_contactsSyncedAtKey);
    if (raw == null) return null;
    return DateTime.tryParse(raw);
  }
}
