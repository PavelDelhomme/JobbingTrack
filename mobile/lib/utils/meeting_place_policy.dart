/// Détection lieu entretien (présentiel / tél / visio) + liens invite — aligné backend meetingPlacePolicy.
library meeting_place_policy;

enum MeetingModality { presentiel, visio, telephone, hybride, inconnu }

class MeetingArtifacts {
  const MeetingArtifacts({
    required this.videoLinks,
    required this.inviteLinks,
    required this.phones,
  });

  final List<String> videoLinks;
  final List<String> inviteLinks;
  final List<String> phones;

  String? get primaryVideoLink => videoLinks.isEmpty ? null : videoLinks.first;
  String? get primaryInviteLink => inviteLinks.isEmpty ? null : inviteLinks.first;
}

class MeetingPlacePolicy {
  MeetingPlacePolicy._();

  static final _videoHost = RegExp(
    r'(?:https?:\/\/)?(?:[\w.-]+\.)?(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com|teams\.live\.com|webex\.com|whereby\.com)[^\s<>"]*',
    caseSensitive: false,
  );
  static final _calendarInvite = RegExp(
    r'(?:https?:\/\/)?(?:calendar\.google\.com\/[^\s<>"]+|outlook\.office(?:365)?\.com\/[^\s<>"]*calendar[^\s<>"]*)',
    caseSensitive: false,
  );
  static final _ics = RegExp(r'https?:\/\/[^\s<>"]+\.ics(?:\?[^\s<>"]*)?', caseSensitive: false);
  static final _phone = RegExp(
    r'(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{2,4}(?:[\s.-]?\d{2}){2,4}',
  );
  static final _addressHint = RegExp(
    r'\b(?:rue|avenue|av\.|bd|boulevard|place|impasse|chemin|route|all[eé]e|cedex|bureau|salle)\b',
    caseSensitive: false,
  );

  static String _norm(String? v) {
    if (v == null) return '';
    return v
        .toLowerCase()
        .replaceAll(RegExp(r'[àáâãäå]'), 'a')
        .replaceAll(RegExp(r'[èéêë]'), 'e')
        .replaceAll(RegExp(r'[ìíîï]'), 'i')
        .replaceAll(RegExp(r'[òóôõö]'), 'o')
        .replaceAll(RegExp(r'[ùúûü]'), 'u')
        .replaceAll('ç', 'c');
  }

  static MeetingModality detectModality({
    String? location,
    String? videoLink,
    String? text,
  }) {
    final loc = (location ?? '').trim();
    final video = (videoLink ?? '').trim();
    final blob = _norm([loc, video, text ?? ''].where((e) => e.isNotEmpty).join(' '));

    final hasVideo = video.isNotEmpty ||
        _videoHost.hasMatch(blob) ||
        RegExp(r'\b(visio|visioconference|teams|zoom|meet|distanciel|en ligne)\b').hasMatch(blob);

    final digits = loc.replaceAll(RegExp(r'\D'), '');
    final phoneOnly = loc.isNotEmpty &&
        !_addressHint.hasMatch(loc) &&
        !_videoHost.hasMatch(loc) &&
        digits.length >= 8 &&
        digits.length <= 15 &&
        RegExp(r'^[\d\s.()+-]+$').hasMatch(loc);

    final hasPhone = phoneOnly ||
        RegExp(r'\b(telephone|appel|par tel|appel telephonique)\b').hasMatch(blob);
    final hasAddress = loc.isNotEmpty &&
        !phoneOnly &&
        (_addressHint.hasMatch(loc) || RegExp(r'\d{5}').hasMatch(loc) || loc.contains(','));

    if (hasVideo && (hasAddress || hasPhone)) return MeetingModality.hybride;
    if (hasVideo) return MeetingModality.visio;
    if (hasPhone && !hasAddress) return MeetingModality.telephone;
    if (hasAddress) return MeetingModality.presentiel;
    if (blob.contains('presentiel')) return MeetingModality.presentiel;
    if (blob.contains('distanciel')) return MeetingModality.visio;
    return MeetingModality.inconnu;
  }

  static String modalityLabelFr(MeetingModality m) {
    switch (m) {
      case MeetingModality.presentiel:
        return 'Présentiel';
      case MeetingModality.visio:
        return 'Visioconférence (pas en présentiel)';
      case MeetingModality.telephone:
        return 'Téléphone (pas en présentiel)';
      case MeetingModality.hybride:
        return 'Hybride';
      case MeetingModality.inconnu:
        return 'À préciser';
    }
  }

  /// Labels dropdown création entretien.
  static String styleForForm(MeetingModality m) {
    switch (m) {
      case MeetingModality.presentiel:
        return 'Présentiel';
      case MeetingModality.visio:
      case MeetingModality.telephone:
        return 'Distanciel';
      case MeetingModality.hybride:
        return 'Hybride';
      case MeetingModality.inconnu:
        return 'Présentiel';
    }
  }

  static MeetingArtifacts extractArtifacts(String? text) {
    final raw = text ?? '';
    String abs(String u) => u.startsWith('http') ? u : 'https://$u';

    final videos = _videoHost
        .allMatches(raw)
        .map((m) => abs(m.group(0)!.replaceAll(RegExp(r'[),.;]+$'), '')))
        .toSet()
        .toList();
    final invites = <String>{
      ..._calendarInvite.allMatches(raw).map((m) => abs(m.group(0)!.replaceAll(RegExp(r'[),.;]+$'), ''))),
      ..._ics.allMatches(raw).map((m) => m.group(0)!),
    }.toList();
    final phones = <String>[];
    for (final m in _phone.allMatches(raw)) {
      final d = m.group(0)!.replaceAll(RegExp(r'\D'), '');
      if (d.length >= 10 && d.length <= 15) phones.add(m.group(0)!.trim());
    }

    return MeetingArtifacts(
      videoLinks: videos,
      inviteLinks: invites,
      phones: phones.toSet().take(5).toList(),
    );
  }

  static bool isBilanDeCompetences(String? text) {
    final n = _norm(text);
    return n.contains('bilan de competence') ||
        n.contains('bilan competences') ||
        (n.contains('bilan') && n.contains('competence')) ||
        n.contains('conseiller en evolution');
  }
}
