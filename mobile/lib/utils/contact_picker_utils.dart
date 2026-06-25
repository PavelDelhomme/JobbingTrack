/// Prépare les contacts pour le picker : liés candidature, puis entreprise, puis autres.
class ContactPickerSections {
  final List<Map<String, dynamic>> linkedToApplication;
  final List<Map<String, dynamic>> linkedToCompany;
  final List<Map<String, dynamic>> others;

  const ContactPickerSections({
    required this.linkedToApplication,
    required this.linkedToCompany,
    required this.others,
  });

  List<Map<String, dynamic>> get all => [
        ...linkedToApplication,
        ...linkedToCompany,
        ...others,
      ];
}

ContactPickerSections partitionContacts({
  required List<Map<String, dynamic>> candidates,
  required Set<String> applicationLinkedIds,
  required Set<String> companyLinkedIds,
}) {
  final linkedApp = <Map<String, dynamic>>[];
  final linkedCo = <Map<String, dynamic>>[];
  final rest = <Map<String, dynamic>>[];
  final seen = <String>{};

  for (final c in candidates) {
    final id = c['id']?.toString();
    if (id == null || id.isEmpty || seen.contains(id)) continue;
    seen.add(id);
    if (applicationLinkedIds.contains(id)) {
      linkedApp.add(c);
    } else if (companyLinkedIds.contains(id)) {
      linkedCo.add(c);
    } else {
      rest.add(c);
    }
  }

  int sortName(Map<String, dynamic> a, Map<String, dynamic> b) {
    final na = '${a['lastName'] ?? ''} ${a['firstName'] ?? ''}'.toLowerCase();
    final nb = '${b['lastName'] ?? ''} ${b['firstName'] ?? ''}'.toLowerCase();
    return na.compareTo(nb);
  }

  linkedApp.sort(sortName);
  linkedCo.sort(sortName);
  rest.sort(sortName);

  return ContactPickerSections(
    linkedToApplication: linkedApp,
    linkedToCompany: linkedCo,
    others: rest,
  );
}

bool contactMatchesQuery(Map<String, dynamic> c, String query) {
  if (query.isEmpty) return true;
  final q = query.toLowerCase();
  final hay = [
    c['firstName'],
    c['lastName'],
    c['email'],
    c['phone'],
    c['position'],
  ].whereType<String>().join(' ').toLowerCase();
  return hay.contains(q);
}
