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
    final now = DateTime.now();
    final submittedAt =
        '${now.day} ${_monthName(now.month)} ${now.year} · ${now.hour.toString().padLeft(2, '0')}.${now.minute.toString().padLeft(2, '0')} WIB';

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
              decoration: BoxDecoration(
                color: AppTheme.okBg,
                borderRadius: BorderRadius.circular(30),
              ),
              child: const Icon(
                Icons.check,
                size: 52,
                color: AppTheme.ok,
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
            'Permohonan Anda sedang diproses dan akan dikirim ke email '
            '${flowDraft.applicantEmail} dalam waktu maksimal 3×24 jam.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppTheme.ink500, height: 1.5),
          ),
          const SizedBox(height: 22),
          // Reference code card
          Card(
            color: AppTheme.g50,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const Text(
                    'Kode Permohonan',
                    style: TextStyle(
                      color: AppTheme.ink500,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'BLG-2K7F9',
                    style: TextStyle(
                      color: AppTheme.villageGreen,
                      fontSize: 28,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 2,
                      fontFeatures: [],
                    ),
                  ),
                  const Divider(height: 28),
                  _InfoRow('Jenis Surat', flowDraft.letterType.name),
                  _InfoRow('Dikirim ke', flowDraft.applicantEmail),
                  _InfoRow('Waktu Pengajuan', submittedAt),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Info alert
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.g50,
              border: Border.all(color: AppTheme.g300),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Row(
              children: [
                Icon(Icons.info_outline, size: 18, color: AppTheme.g700),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Menunggu persetujuan petugas. Simpan kode permohonan untuk pelacakan.',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppTheme.g700,
                      fontWeight: FontWeight.w600,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
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

  static String _monthName(int month) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
    ];
    return months[month - 1];
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(color: AppTheme.ink500),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
