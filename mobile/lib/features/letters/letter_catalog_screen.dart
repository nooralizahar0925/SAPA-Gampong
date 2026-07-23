import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/letter_type.dart';
import '../../data/providers/letter_providers.dart';
import 'letter_form_screen.dart';

class LetterCatalogScreen extends ConsumerStatefulWidget {
  const LetterCatalogScreen({super.key});

  @override
  ConsumerState<LetterCatalogScreen> createState() =>
      _LetterCatalogScreenState();
}

class _LetterCatalogScreenState extends ConsumerState<LetterCatalogScreen> {
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
    final typesAsync = ref.watch(letterTypesProvider);

    return SapaScaffold(
      title: 'Permohonan Surat',
      subtitle: 'Langkah 1 dari 5',
      leading: const SapaBackButton(),
      padding: EdgeInsets.zero,
      body: typesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, st) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off_outlined,
                    size: 48, color: AppTheme.ink300),
                const SizedBox(height: 14),
                const Text(
                  'Gagal memuat jenis surat.',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Periksa koneksi internet lalu coba lagi.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppTheme.ink500),
                ),
                const SizedBox(height: 20),
                FilledButton.icon(
                  key: const Key('catalog-retry'),
                  onPressed: () => ref.invalidate(letterTypesProvider),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Coba Lagi'),
                ),
              ],
            ),
          ),
        ),
        data: (types) => _CatalogBody(
          types: types,
          query: _query,
          searchController: _search,
        ),
      ),
    );
  }
}

class _CatalogBody extends StatelessWidget {
  const _CatalogBody({
    required this.types,
    required this.query,
    required this.searchController,
  });

  final List<LetterType> types;
  final String query;
  final TextEditingController searchController;

  @override
  Widget build(BuildContext context) {
    final filtered = query.isEmpty
        ? types
        : types
            .where((l) => l.name.toLowerCase().contains(query.toLowerCase()))
            .toList();

    return ListView(
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
          controller: searchController,
          decoration: InputDecoration(
            hintText: 'Cari jenis surat…',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: query.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: searchController.clear,
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
                extra: letter,
              ),
            ),
          ),
        if (filtered.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Center(
              child: Text(
                'Tidak ada surat yang cocok.',
                style: TextStyle(color: AppTheme.ink500),
              ),
            ),
          ),
      ],
    );
  }
}

class _LetterTile extends StatelessWidget {
  const _LetterTile({super.key, required this.letter, required this.onTap});

  final LetterType letter;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        minLeadingWidth: 42,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
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
