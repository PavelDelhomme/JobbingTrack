import 'package:flutter/material.dart';
import 'package:jobbingtrack_mobile/services/place_suggest_service.dart';

/// Champ lieu avec suggestions Nominatim (saisie libre toujours possible).
class LocationAutocompleteField extends StatefulWidget {
  final TextEditingController controller;
  final String labelText;
  final String? hintText;
  final ValueChanged<String>? onChanged;

  const LocationAutocompleteField({
    super.key,
    required this.controller,
    this.labelText = 'Lieu',
    this.hintText = 'Ville, adresse…',
    this.onChanged,
  });

  @override
  State<LocationAutocompleteField> createState() => _LocationAutocompleteFieldState();
}

class _LocationAutocompleteFieldState extends State<LocationAutocompleteField> {
  final FocusNode _focusNode = FocusNode();
  List<PlaceSuggestion> _suggestions = [];
  bool _loading = false;
  String _lastQuery = '';

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _onQueryChanged(String value) async {
    widget.onChanged?.call(value);
    final q = value.trim();
    if (q.length < 3) {
      if (_suggestions.isNotEmpty || _loading) {
        setState(() {
          _suggestions = [];
          _loading = false;
        });
      }
      return;
    }
    setState(() => _loading = true);
    final hits = await PlaceSuggestService.searchDebounced(q);
    if (!mounted || widget.controller.text.trim() != q) return;
    setState(() {
      _lastQuery = q;
      _suggestions = hits;
      _loading = false;
    });
  }

  void _select(PlaceSuggestion hit) {
    widget.controller.text = hit.label;
    widget.controller.selection = TextSelection.collapsed(offset: hit.label.length);
    widget.onChanged?.call(hit.label);
    setState(() => _suggestions = []);
    _focusNode.unfocus();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          label: widget.labelText,
          textField: true,
          child: TextFormField(
            controller: widget.controller,
            focusNode: _focusNode,
            decoration: InputDecoration(
              labelText: widget.labelText,
              hintText: widget.hintText,
              border: const OutlineInputBorder(),
              suffixIcon: _loading
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : const Icon(Icons.place_outlined),
            ),
            textInputAction: TextInputAction.next,
            onChanged: _onQueryChanged,
          ),
        ),
        if (_suggestions.isNotEmpty && _focusNode.hasFocus) ...[
          const SizedBox(height: 4),
          Material(
            elevation: 2,
            borderRadius: BorderRadius.circular(8),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 220),
              child: ListView.builder(
                shrinkWrap: true,
                padding: EdgeInsets.zero,
                itemCount: _suggestions.length,
                itemBuilder: (_, i) {
                  final s = _suggestions[i];
                  return ListTile(
                    dense: true,
                    leading: const Icon(Icons.place_outlined, size: 20),
                    title: Text(s.label),
                    subtitle: s.subtitle != null
                        ? Text(
                            s.subtitle!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          )
                        : null,
                    onTap: () => _select(s),
                  );
                },
              ),
            ),
          ),
        ] else if (_loading && _lastQuery.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            'Recherche de lieux…',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
          ),
        ],
      ],
    );
  }
}
