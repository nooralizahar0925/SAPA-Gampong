import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/resident_email_gate.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/resident_session.dart';
import '../../data/providers/resident_providers.dart';

class MyFeedbackScreen extends ConsumerWidget {
  const MyFeedbackScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feedbackAsync = ref.watch(residentFeedbackProvider);
    return SapaScaffold(
      title: 'Laporan Saya',
      subtitle: 'Riwayat pelaporan warga',
      leading: const SapaBackButton(),
      body: ResidentEmailGate(
        child: feedbackAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, _) => const _EmptyState(
            title: 'Riwayat belum bisa dimuat',
            body: 'Coba lagi saat koneksi tersedia.',
          ),
          data: (items) => items.isEmpty
              ? const _EmptyState(
                  title: 'Belum ada laporan',
                  body:
                      'Laporan yang memakai email tersimpan akan tampil di sini.',
                )
              : RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(residentFeedbackProvider);
                    await ref.read(residentFeedbackProvider.future);
                  },
                  child: ListView.separated(
                    itemCount: items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (_, index) =>
                        _FeedbackCard(item: items[index]),
                  ),
                ),
        ),
      ),
    );
  }
}

class _FeedbackCard extends StatelessWidget {
  const _FeedbackCard({required this.item});

  final ResidentFeedbackItem item;

  @override
  Widget build(BuildContext context) {
    final colors = _statusColors(item.status);
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
                    _statusLabel(item.status),
                    style: TextStyle(
                      color: colors.$2,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              item.body,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppTheme.ink700),
            ),
            const SizedBox(height: 6),
            Text(
              'Dikirim ${_fmt(item.createdAt)}',
              style: const TextStyle(fontSize: 12, color: AppTheme.ink300),
            ),
            if (item.reply != null && item.reply!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.g50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.reply_outlined,
                      size: 16,
                      color: AppTheme.g700,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        item.reply!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.g700,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
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
                const Icon(Icons.campaign_outlined, color: AppTheme.g700),
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
    'responded' => (AppTheme.okBg, AppTheme.ok),
    'read' => (AppTheme.warnBg, AppTheme.warn),
    _ => (AppTheme.g50, AppTheme.g700),
  };
}

String _statusLabel(String status) {
  return switch (status) {
    'responded' => 'Dibalas',
    'read' => 'Dibaca',
    _ => 'Baru',
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
