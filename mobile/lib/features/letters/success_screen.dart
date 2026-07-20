import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import 'letter_form_screen.dart';

class SuccessScreen extends StatelessWidget {
  const SuccessScreen({super.key, required this.flowDraft});

  final LetterFlowDraft flowDraft;

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Gampong Blang',
      subtitle: 'Permohonan terkirim',
      body: ListView(
        children: [
          const SizedBox(height: 42),
          Center(
            child: Container(
              width: 92,
              height: 92,
              decoration: const BoxDecoration(
                color: Color(0xFFD7EEE3),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle,
                size: 62,
                color: AppTheme.villageGreen,
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Permohonan telah dikirim',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          Text(
            'Permohonan Anda sedang diproses dan akan dikirim ke email ${flowDraft.applicantEmail} dalam waktu maksimal 3×24 jam.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF667069), height: 1.5),
          ),
          const SizedBox(height: 22),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const Text(
                    'Kode Permohonan',
                    style: TextStyle(
                      color: Color(0xFF667069),
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'BLG-2K7F9',
                    style: TextStyle(
                      color: AppTheme.villageGreen,
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const Divider(height: 28),
                  _InfoRow('Jenis Surat', flowDraft.letterType.name),
                  const _InfoRow('Status', 'Menunggu persetujuan petugas'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => context.goNamed(AppRouteNames.home),
            child: const Text('Kembali ke Beranda'),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: () => context.goNamed(AppRouteNames.tracking),
            child: const Text('Lacak Permohonan'),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}
