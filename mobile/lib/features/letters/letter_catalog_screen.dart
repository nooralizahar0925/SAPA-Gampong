import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/mock/letter_seed.dart';
import 'letter_form_screen.dart';
// StepHeader + StepLabels are exported from letter_form_screen.dart

class LetterCatalogScreen extends StatefulWidget {
  const LetterCatalogScreen({super.key});

  @override
  State<LetterCatalogScreen> createState() => _LetterCatalogScreenState();
}

class _LetterCatalogScreenState extends State<LetterCatalogScreen> {
  final _search = TextEditingController();
  String _query = '';

  @override
  void initState() {
    super.initState();
    _search.addListener(() => setState(() => _query = _search.text));
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = sampleLetterTypes
        .where(
          (l) =>
              _query.isEmpty ||
              l.name.toLowerCase().contains(_query.toLowerCase()),
        )
        .toList();

    return SapaScaffold(
      title: 'Permohonan Surat',
      subtitle: 'Langkah 1 dari 5',
      leading: const SapaBackButton(),
      padding: EdgeInsets.zero,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          StepHeader(step: 1, code: ''),
          const Text(
            'Pilih jenis surat',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          const Text(
            'Silakan pilih surat keterangan yang Anda butuhkan.',
            style: TextStyle(color: AppTheme.ink500),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _search,
            decoration: InputDecoration(
              hintText: 'Cari jenis surat…',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _query.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () => _search.clear(),
                    )
                  : null,
            ),
          ),
          const SizedBox(height: 16),
          for (final letter in filtered)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _LetterTile(
                key: Key('letter-type-${letter.code}'),
                letter: letter,
                onTap: () => context.pushNamed(
                  AppRouteNames.letterForm,
                  pathParameters: {'code': letter.code},
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _LetterTile extends StatelessWidget {
  const _LetterTile({super.key, required this.letter, required this.onTap});

  final dynamic letter;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        minLeadingWidth: 42,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        leading: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: AppTheme.g50,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(
            Icons.description_outlined,
            color: AppTheme.villageGreen,
          ),
        ),
        title: Text(
          letter.name,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5),
        ),
        subtitle: Text('${letter.code} · ${letter.description}'),
        trailing: const Icon(Icons.chevron_right, color: AppTheme.ink300),
      ),
    );
  }
}
