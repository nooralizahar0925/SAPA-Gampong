import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/resident_email_gate.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/letter_type.dart';
import '../../data/models/resident_session.dart';
import '../../data/providers/letter_providers.dart';
import '../../data/providers/resident_providers.dart';
import 'letter_form_screen.dart';

class MyRequestsScreen extends ConsumerStatefulWidget {
  const MyRequestsScreen({super.key});

  @override
  ConsumerState<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends ConsumerState<MyRequestsScreen>
    with WidgetsBindingObserver {
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      unawaited(_refreshRequests());
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_refreshRequests());
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_refreshRequests());
    }
  }

  @override
  Widget build(BuildContext context) {
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
                  onRefresh: _refreshRequests,
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

  Future<void> _refreshRequests() async {
    if (!mounted) return;
    ref.invalidate(residentRequestsProvider);
    try {
      await ref.read(residentRequestsProvider.future);
    } catch (_) {
      // Keep the cached history visible if staging/API is temporarily down.
    }
  }
}

class _RequestCard extends ConsumerStatefulWidget {
  const _RequestCard({required this.item});

  final ResidentRequestItem item;

  @override
  ConsumerState<_RequestCard> createState() => _RequestCardState();
}

class _RequestCardState extends ConsumerState<_RequestCard> {
  bool _canceling = false;

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final colors = _statusColors(item.status);
    final showDownload =
        item.generatedPdfUrl != null &&
        (item.status == 'GENERATED' || item.status == 'SENT');
    final canCancel = item.status == 'SUBMITTED';
    final letterTypes =
        ref.watch(letterTypesProvider).asData?.value ?? const [];

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.pushNamed(
          AppRouteNames.tracking,
          extra: item.referenceCode,
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: _StatusPill(item.statusLabel, colors.$1, colors.$2),
              ),
              const SizedBox(height: 8),
              Text(
                item.referenceCode,
                key: Key('request-card-code-${item.referenceCode}'),
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                  height: 1.22,
                ),
              ),
              const SizedBox(height: 8),
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
              if (canCancel || item.status == 'NEEDS_INFO' || showDownload) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (item.status == 'NEEDS_INFO')
                      FilledButton.icon(
                        key: Key('request-correct-${item.id}'),
                        onPressed: () => _startCorrection(item, letterTypes),
                        icon: const Icon(Icons.edit_note_outlined, size: 18),
                        label: const Text('Perbaiki data'),
                      ),
                    if (item.status == 'NEEDS_INFO')
                      OutlinedButton.icon(
                        onPressed: () => context.pushNamed(
                          AppRouteNames.tracking,
                          extra: item.referenceCode,
                        ),
                        icon: const Icon(Icons.history_outlined, size: 18),
                        label: const Text('Lihat riwayat'),
                      ),
                    if (canCancel)
                      OutlinedButton.icon(
                        key: Key('request-cancel-${item.id}'),
                        onPressed: _canceling
                            ? null
                            : () => _confirmCancel(item),
                        icon: _canceling
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.cancel_outlined, size: 18),
                        label: Text(_canceling ? 'Membatalkan...' : 'Batalkan'),
                      ),
                    if (showDownload)
                      FilledButton.icon(
                        onPressed: () {},
                        icon: const Icon(
                          Icons.picture_as_pdf_outlined,
                          size: 18,
                        ),
                        label: const Text('Surat tersedia di email'),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirmCancel(ResidentRequestItem item) async {
    final approved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Batalkan permohonan?'),
        content: const Text(
          'Permohonan hanya bisa dibatalkan sebelum ditinjau petugas.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Tidak'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Batalkan'),
          ),
        ],
      ),
    );

    if (approved != true || !mounted) return;

    final session = ref.read(residentSessionProvider).asData?.value;
    if (session == null) return;

    setState(() => _canceling = true);
    try {
      await ref
          .read(residentRepositoryProvider)
          .cancelRequest(session: session, id: item.id);
      ref.invalidate(residentRequestsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Permohonan telah dibatalkan.')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Permohonan tidak bisa dibatalkan saat ini.'),
        ),
      );
    } finally {
      if (mounted) setState(() => _canceling = false);
    }
  }

  void _startCorrection(
    ResidentRequestItem item,
    List<LetterType> letterTypes,
  ) {
    LetterType? letterType;
    for (final type in letterTypes) {
      if (type.code == item.letterType) {
        letterType = type;
        break;
      }
    }
    if (letterType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Jenis surat belum bisa dimuat. Coba lagi.'),
        ),
      );
      return;
    }

    context.pushNamed(
      AppRouteNames.letterForm,
      extra: LetterFlowDraft(
        letterType: letterType,
        applicantName: item.applicantName,
        applicantEmail: item.applicantEmail,
        applicantPhone: item.applicantPhone ?? '',
        subjectData: {
          for (final entry in item.subjectData.entries)
            entry.key: entry.value?.toString() ?? '',
        },
        attachments: item.attachments,
        keperluan: item.keperluan,
        referenceCode: item.referenceCode,
        requestId: item.id,
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
    'REJECTED' || 'CANCELED' => (AppTheme.dangerBg, AppTheme.danger),
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
