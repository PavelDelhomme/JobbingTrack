import 'package:flutter/material.dart';

String applicationStatusLabel(String status) {
  switch (status) {
    case 'NO_RESPONSE':
      return 'Aucune réponse';
    case 'INTERVIEW_SCHEDULED':
    case 'INTERVIEW':
      return 'Entretien programmé';
    case 'SENT':
    case 'APPLIED':
      return 'Envoyée';
    case 'REJECTED':
      return 'Refusée';
    case 'ACCEPTED':
      return 'Acceptée';
    case 'OFFER_RECEIVED':
      return 'Offre reçue';
    case 'IN_PROGRESS':
      return 'En cours';
    case 'WITHDRAWN':
      return 'Retirée';
    default:
      if (status.isEmpty) return '—';
      return status.replaceAll('_', ' ').toLowerCase();
  }
}

Color applicationStatusColor(String status) {
  if (status.contains('INTERVIEW')) return Colors.green;
  if (status == 'REJECTED') return Colors.red;
  if (status == 'SENT' || status.contains('PENDING')) return Colors.blue;
  if (status == 'ACCEPTED' || status == 'OFFER_RECEIVED') return Colors.teal;
  return Colors.grey;
}

String followUpStatusLabel(String status) {
  switch (status) {
    case 'PENDING':
      return 'À faire';
    case 'COMPLETED':
      return 'Terminée';
    case 'CANCELLED':
      return 'Annulée';
    default:
      return status;
  }
}

String contactDisplayName(Map<String, dynamic> contact) {
  final fn = (contact['firstName'] ?? '').toString().trim();
  final ln = (contact['lastName'] ?? '').toString().trim();
  if (ln == '.' || ln == '—') return fn;
  if (fn == '.' || fn == '—') return ln;
  final name = '$fn $ln'.trim();
  if (name.isNotEmpty) return name;
  final email = contact['email']?.toString();
  if (email != null && email.isNotEmpty) return email;
  return 'Contact';
}
