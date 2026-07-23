import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/resident_email_gate.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/resident_session.dart';
import '../../data/providers/resident_providers.dart';

class MyRequestsScreen extends ConsumerWidget {
  const MyRequestsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requestsAsync = ref.watch(residentRequestsProvider);
    return SapaScaffold(
      title: 'Permohonan Saya',
      subtitle: 'Riwayat berdasarkan email tersimpan',
      leading: const SapaBackButton(),
      body: ResidentEmailGate(
        child: requestsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, _) => const _EmptyState(
            title: 'Riwayat belum bisa dimuat',
            body: 'Coba lagi saat koneksi tersedia.',
          ),
          data: (items) => items.isEmpty
              ? const _EmptyState(
                  title: 'Belum ada permohonan',
                  body:
                      'Permohonan surat yang memakai email tersimpan akan tampil di sini.',
                )
              : RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(residentRequestsProvider);
                    await ref.read(residentRequestsProvider.future);
                  },
                  child: ListView.separated(
                    itemCount: items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (_, index) => _RequestCard(item: items[index]),
                  ),
                ),
        ),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({required this.item});

  final ResidentRequestItem item;

  @override
  Widget build(BuildContext context) {
    final colors = _statusColors(item.status);
    final showDownload =
        item.generatedPdfUrl != null &&
        (item.status == 'GENERATED' || item.status == 'SENT');

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    item.referenceCode,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: colors.$1,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    item.statusLabel,
                    style: TextStyle(
                      color: colors.$2,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              _letterLabel(item.letterType),
              style: const TextStyle(color: AppTheme.ink500),
            ),
            const SizedBox(height: 4),
            Text(
              'Diajukan ${_fmt(item.createdAt)}',
              style: const TextStyle(fontSize: 12, color: AppTheme.ink300),
            ),
            if (item.decisionReason != null &&
                item.decisionReason!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.warnBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.info_outline,
                      size: 16,
                      color: AppTheme.warn,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        item.decisionReason!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.warn,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (showDownload) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.picture_as_pdf_outlined, size: 18),
                  label: const Text('Surat tersedia di email'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.inbox_outlined, color: AppTheme.g700),
                const SizedBox(height: 10),
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                  ),
                ),
                const SizedBox(height: 6),
                Text(body, style: const TextStyle(color: AppTheme.ink500)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

(Color, Color) _statusColors(String status) {
  return switch (status) {
    'SENT' || 'GENERATED' || 'APPROVED' => (AppTheme.okBg, AppTheme.ok),
    'REJECTED' => (AppTheme.dangerBg, AppTheme.danger),
    _ => (AppTheme.warnBg, AppTheme.warn),
  };
}

String _letterLabel(String code) {
  return switch (code) {
    'L1' => 'Surat Keterangan Berdomisili',
    'L2' => 'Surat Keterangan Domisili Kantor',
    'L3' => 'Surat Keterangan Kehilangan',
    'L4' => 'Surat Keterangan Miskin',
    'L5' => 'Surat Keterangan Usaha',
    'L6' => 'Surat Keterangan Yatim / Piatu',
    'L7' => 'Surat Keterangan Kematian',
    'L8' => 'Surat Keterangan Berkelakuan Baik',
    _ => code,
  };
}

String _fmt(DateTime value) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];
  return '${value.day.toString().padLeft(2, '0')} ${months[value.month - 1]} ${value.year}';
}
