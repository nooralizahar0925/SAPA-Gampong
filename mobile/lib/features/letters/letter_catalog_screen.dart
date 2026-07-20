import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/mock/letter_seed.dart';

class LetterCatalogScreen extends StatelessWidget {
  const LetterCatalogScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Permohonan Surat',
      subtitle: 'Langkah 1 dari 5',
      leading: const BackButton(),
      body: ListView(
        children: [
          const Text(
            'Pilih jenis surat',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          const Text(
            'Formulir akan menyesuaikan jenis surat yang dipilih.',
            style: TextStyle(color: Color(0xFF667069)),
          ),
          const SizedBox(height: 16),
          for (final letter in sampleLetterTypes)
            SapaListTile(
              key: Key('letter-type-${letter.code}'),
              icon: Icons.description_outlined,
              title: letter.name,
              subtitle: '${letter.code} · ${letter.description}',
              onTap: () => context.goNamed(
                AppRouteNames.letterForm,
                pathParameters: {'code': letter.code},
              ),
            ),
        ],
      ),
    );
  }
}
