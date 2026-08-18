import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/resident_email_gate.dart';
import '../../core/widgets/sapa_fields.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/resident_session.dart';
import '../../data/providers/resident_providers.dart';

class MyFeedbackScreen extends ConsumerStatefulWidget {
  const MyFeedbackScreen({super.key});

  @override
  ConsumerState<MyFeedbackScreen> createState() => _MyFeedbackScreenState();
}

class _MyFeedbackScreenState extends ConsumerState<MyFeedbackScreen> {
  final _search = TextEditingController();
  String _status = 'all';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final feedbackAsync = ref.watch(residentFeedbackProvider);
    return SapaScaffold(
      title: 'Laporan Saya',
      subtitle: 'Riwayat pelaporan warga',
      leading: const SapaBackButton(),
      body: ResidentEmailGate(
        child: feedbackAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppTheme.gold500),
          ),
          error: (_, _) => RefreshIndicator(
            onRefresh: () async => _refresh(ref),
            child: const _EmptyState(
              title: 'Riwayat belum bisa dimuat',
              body: 'Coba lagi saat koneksi tersedia.',
            ),
          ),
          data: (items) => RefreshIndicator(
            onRefresh: () async => _refresh(ref),
            child: items.isEmpty
                ? const _EmptyState(
                    title: 'Belum ada laporan',
                    body:
                        'Laporan yang memakai email tersimpan akan tampil di sini.',
                  )
                : ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: _filtered(items).isEmpty
                        ? 2
                        : _filtered(items).length + 1,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (_, index) {
                      if (index == 0) {
                        return _FilterPanel(
                          search: _search,
                          status: _status,
                          onSearchChanged: () => setState(() {}),
                          onStatusChanged: (value) =>
                              setState(() => _status = value),
                        );
                      }
                      final filtered = _filtered(items);
                      if (filtered.isEmpty) {
                        return const _NoMatchesCard();
                      }
                      return _FeedbackCard(item: filtered[index - 1]);
                    },
                  ),
          ),
        ),
      ),
    );
  }

  List<ResidentFeedbackItem> _filtered(List<ResidentFeedbackItem> items) {
    final query = _search.text.trim().toLowerCase();
    return items.where((item) {
      final matchesStatus = _status == 'all' || item.status == _status;
      final matchesCode =
          query.isEmpty || item.referenceCode.toLowerCase().contains(query);
      return matchesStatus && matchesCode;
    }).toList();
  }

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(residentFeedbackProvider);
    await ref.read(residentFeedbackProvider.future);
  }
}

class _FilterPanel extends StatelessWidget {
  const _FilterPanel({
    required this.search,
    required this.status,
    required this.onSearchChanged,
    required this.onStatusChanged,
  });

  final TextEditingController search;
  final String status;
  final VoidCallback onSearchChanged;
  final ValueChanged<String> onStatusChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SapaTextField(
          key: const Key('feedback-search-code'),
          controller: search,
          label: 'Cari kode laporan',
          hintText: 'Contoh: LPR-79459',
          prefixIcon: const Icon(Icons.search),
          textInputAction: TextInputAction.search,
          onChanged: (_) => onSearchChanged(),
        ),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _FilterChip(
                status: status,
                value: 'all',
                label: 'Semua',
                onSelected: onStatusChanged,
              ),
              _FilterChip(
                status: status,
                value: 'new',
                label: 'Baru',
                onSelected: onStatusChanged,
              ),
              _FilterChip(
                status: status,
                value: 'read',
                label: 'Ditinjau',
                onSelected: onStatusChanged,
              ),
              _FilterChip(
                status: status,
                value: 'responded',
                label: 'Dibalas',
                onSelected: onStatusChanged,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.status,
    required this.value,
    required this.label,
    required this.onSelected,
  });

  final String status;
  final String value;
  final String label;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        key: Key('feedback-filter-$value'),
        label: Text(label),
        selected: status == value,
        onSelected: (_) => onSelected(value),
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
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () =>
            context.pushNamed(AppRouteNames.myFeedbackDetail, extra: item),
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
                  _StatusPill(_statusLabel(item.status), colors.$1, colors.$2),
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
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.ink500,
                  fontWeight: FontWeight.w600,
                ),
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
      ),
    );
  }
}

class MyFeedbackDetailScreen extends StatelessWidget {
  const MyFeedbackDetailScreen({super.key, required this.item});

  final ResidentFeedbackItem item;

  @override
  Widget build(BuildContext context) {
    final colors = _statusColors(item.status);
    return SapaScaffold(
      title: 'Detail Laporan',
      subtitle: item.referenceCode,
      leading: const SapaBackButton(),
      body: ListView(
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          item.referenceCode,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      _StatusPill(
                        _statusLabel(item.status),
                        colors.$1,
                        colors.$2,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Dikirim ${_fmt(item.createdAt)}',
                    style: const TextStyle(color: AppTheme.ink500),
                  ),
                ],
              ),
            ),
          ),
          _DetailBlock(
            title: 'Data Pelapor',
            children: [
              _DetailRow(
                label: 'Nama',
                value: item.name.isEmpty ? '-' : item.name,
              ),
              _DetailRow(
                label: 'Email',
                value: item.email.isEmpty ? '-' : item.email,
              ),
              _DetailRow(
                label: 'No. HP',
                value: item.phone?.isNotEmpty == true ? item.phone! : '-',
              ),
            ],
          ),
          _DetailBlock(
            title: 'Isi Laporan',
            children: [
              Text(
                item.body,
                style: const TextStyle(
                  color: AppTheme.ink700,
                  height: 1.45,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          _DetailBlock(
            title: 'Balasan Kantor',
            children: [
              if (item.reply?.isNotEmpty == true)
                Text(
                  item.reply!,
                  style: const TextStyle(
                    color: AppTheme.g700,
                    height: 1.45,
                    fontWeight: FontWeight.w700,
                  ),
                )
              else
                const Text(
                  'Belum ada balasan.',
                  style: TextStyle(color: AppTheme.ink500),
                ),
              if (item.repliedAt != null) ...[
                const SizedBox(height: 8),
                Text(
                  'Dibalas ${_fmt(item.repliedAt!)}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.ink500,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
          _DetailBlock(
            title: 'Lampiran',
            children: item.attachments.isEmpty
                ? const [
                    Text(
                      'Tidak ada lampiran.',
                      style: TextStyle(color: AppTheme.ink500),
                    ),
                  ]
                : [
                    for (final attachment in item.attachments)
                      _AttachmentTile(attachment: attachment),
                  ],
          ),
        ],
      ),
    );
  }
}

class _DetailBlock extends StatelessWidget {
  const _DetailBlock({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 92,
            child: Text(
              label,
              style: const TextStyle(
                color: AppTheme.ink500,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}

class _AttachmentTile extends StatelessWidget {
  const _AttachmentTile({required this.attachment});

  final ResidentFeedbackAttachment attachment;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTheme.g50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.g300),
      ),
      child: Row(
        children: [
          Icon(
            attachment.mime.contains('pdf')
                ? Icons.picture_as_pdf_outlined
                : Icons.image_outlined,
            color: AppTheme.g700,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  attachment.originalName?.isNotEmpty == true
                      ? attachment.originalName!
                      : 'Lampiran ${attachment.kind}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 2),
                Text(
                  '${attachment.kind} · ${_fileSize(attachment.size)}',
                  style: const TextStyle(color: AppTheme.ink500, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
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
      physics: const AlwaysScrollableScrollPhysics(),
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

class _NoMatchesCard extends StatelessWidget {
  const _NoMatchesCard();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Text(
          'Tidak ada laporan yang cocok dengan pencarian.',
          style: TextStyle(color: AppTheme.ink500),
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill(this.text, this.bgColor, this.textColor);

  final String text;
  final Color bgColor;
  final Color textColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: textColor,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
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
    'read' => 'Ditinjau',
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

String _fileSize(int bytes) {
  if (bytes >= 1024 * 1024) {
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
  if (bytes >= 1024) {
    return '${(bytes / 1024).toStringAsFixed(1)} KB';
  }
  return '$bytes B';
}
