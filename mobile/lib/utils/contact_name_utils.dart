/// Normalisation prénom / nom : première lettre de chaque mot en majuscule.
String capitalizePersonName(String input) {
  final trimmed = input.trim();
  if (trimmed.isEmpty) return trimmed;
  return trimmed.split(RegExp(r'\s+')).map((part) {
    if (part.isEmpty) return part;
    if (part.length == 1) return part.toUpperCase();
    return '${part[0].toUpperCase()}${part.substring(1).toLowerCase()}';
  }).join(' ');
}

/// Découpe « Prénom Nom » ou nom seul (nom seul → prénom = nom, nom = « . »).
({String firstName, String lastName}) parsePersonName(String raw) {
  final parts = raw.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) {
    return (firstName: '', lastName: '');
  }
  if (parts.length == 1) {
    final n = capitalizePersonName(parts.first);
    return (firstName: n, lastName: '.');
  }
  return (
    firstName: capitalizePersonName(parts.first),
    lastName: capitalizePersonName(parts.sublist(1).join(' ')),
  );
}
