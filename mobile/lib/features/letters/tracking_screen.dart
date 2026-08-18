import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/contact_actions.dart';
import '../../core/widgets/sapa_fields.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/letter_request.dart';
import '../../data/providers/content_providers.dart';
import '../../data/providers/letter_providers.dart';

class TrackingScreen extends ConsumerStatefulWidget {
  const TrackingScreen({super.key, this.initialCode});

  final String? initialCode;

  @override
  ConsumerState<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends ConsumerState<TrackingScreen> {
  final _controller = TextEditingController();
  bool _loading = false;
  TrackStatus? _status;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    final initialCode = widget.initialCode?.trim();
    if (initialCode != null && initialCode.isNotEmpty) {
      _controller.text = initialCode;
      WidgetsBinding.instance.addPostFrameCallback((_) => _search());
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(villageProfileProvider).asData?.value;
    final contactPhone = resolveOfficePhone(profile?.contactPhone);

    return SapaScaffold(
      title: 'Lacak Permohonan',
      subtitle: _status != null ? _status!.referenceCode : 'Masukkan kode',
      leading: const SapaBackButton(),
      body: ListView(
        children: [
          SapaTextField(
            controller: _controller,
            label: 'Kode Permohonan',
            hintText: 'Contoh: BLG-A1B2',
            textCapitalization: TextCapitalization.characters,
            suffixIcon: IconButton(
              key: const Key('tracking-search'),
              onPressed: _loading ? null : _search,
              icon: _loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.search),
            ),
            onSubmitted: (_) => _search(),
          ),
          const SizedBox(height: 16),
          if (_loading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(color: AppTheme.gold500),
              ),
            ),
          if (_error != null && !_loading) _ErrorCard(message: _error!),
          if (_status != null && !_loading)
            _StatusResult(status: _status!, contactPhone: contactPhone),
        ],
      ),
    );
  }

  Future<void> _search() async {
    final code = _controller.text.trim();
    if (code.isEmpty) return;

    setState(() {
      _loading = true;
      _status = null;
      _error = null;
    });

    try {
      final result = await ref.read(letterRepositoryProvider).track(code);
      if (!mounted) return;
      setState(() {
        _status = result;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Kode tidak ditemukan. Periksa kembali kode permohonan Anda.';
        _loading = false;
      });
    }
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('tracking-error'),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.warnBg,
        border: Border.all(color: AppTheme.warn.withAlpha(80)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppTheme.warn, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: AppTheme.warn,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusResult extends StatelessWidget {
  const _StatusResult({required this.status, required this.contactPhone});

  final TrackStatus status;
  final String contactPhone;

  static const _steps = [
    'Permohonan diajukan',
    'Diterima di kantor keuchik',
    'Ditinjau petugas',
    'Disetujui Keuchik',
    'Surat dibuat & ditandatangani',
    'Surat dikirim ke email',
  ];

  static const _canceledSteps = [
    'Permohonan diajukan',
    'Permohonan dibatalkan',
  ];

  static int _doneCount(String s) => switch (s) {
    'SUBMITTED' || 'pending' => 0,
    'IN_REVIEW' || 'under_review' => 2,
    'NEEDS_INFO' => 2,
    'APPROVED' || 'approved' => 3,
    'GENERATED' || 'signed' => 4,
    'SENT' || 'sent' => 6,
    'REJECTED' => 1,
    'CANCELED' => 1,
    _ => 0,
  };

  static int _currentStep(String s) => switch (s) {
    'SUBMITTED' || 'pending' => 0,
    'IN_REVIEW' || 'under_review' => 2,
    'NEEDS_INFO' => 2,
    'APPROVED' || 'approved' => 3,
    'GENERATED' || 'signed' => 4,
    'SENT' || 'sent' => -1,
    'REJECTED' => -1,
    'CANCELED' => 1,
    _ => 0,
  };

  @override
  Widget build(BuildContext context) {
    final doneCount = _doneCount(status.status);
    final currentStep = _currentStep(status.status);
    final datesByStep = _datesByStep(status);
    final steps = status.status == 'CANCELED' ? _canceledSteps : _steps;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        status.referenceCode,
                        key: const Key('tracking-reference-code'),
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    _StatusBadge(
                      status: status.status,
                      label: status.statusLabel,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  status.letterType,
                  style: const TextStyle(color: AppTheme.ink500),
                ),
                const SizedBox(height: 4),
                Text(
                  'Diperbarui: ${_fmt(status.updatedAt)}',
                  style: const TextStyle(fontSize: 12, color: AppTheme.ink500),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        const SectionTitle('Riwayat Status'),
        for (var i = 0; i < steps.length; i++)
          _TimelineStep(
            done: i < doneCount,
            isNow: i == currentStep,
            isLast: i == steps.length - 1,
            title: steps[i],
            subtitle: i < doneCount
                ? _doneSubtitle(datesByStep[i])
                : i == currentStep
                ? _fmt(datesByStep[i] ?? status.updatedAt)
                : 'Menunggu',
          ),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: () => showOfficeContactActions(context, contactPhone),
          style: FilledButton.styleFrom(
            backgroundColor: AppTheme.gold500,
            foregroundColor: AppTheme.ink900,
          ),
          icon: const Icon(Icons.phone_outlined, size: 18),
          label: const Text('Hubungi Kantor Keuchik'),
        ),
      ],
    );
  }

  static String _doneSubtitle(DateTime? at) =>
      at == null ? 'Selesai' : _fmt(at);

  static Map<int, DateTime> _datesByStep(TrackStatus status) {
    final dates = <int, DateTime>{};
    final createdAt = status.createdAt;
    if (createdAt != null) dates[0] = createdAt;

    for (final item in status.statusHistory) {
      switch (item.status) {
        case 'SUBMITTED':
        case 'pending':
          dates[0] ??= item.at;
        case 'IN_REVIEW':
        case 'under_review':
        case 'NEEDS_INFO':
          dates[2] = item.at;
        case 'APPROVED':
        case 'approved':
          dates[3] = item.at;
        case 'GENERATED':
        case 'signed':
          dates[4] = item.at;
        case 'SENT':
        case 'sent':
          dates[5] = item.at;
        case 'CANCELED':
          dates[1] = item.at;
      }
    }

    final currentStep = _currentStep(status.status);
    if (currentStep >= 0) {
      dates[currentStep] ??= status.updatedAt;
    } else if (status.status == 'SENT' || status.status == 'sent') {
      dates[5] ??= status.updatedAt;
    }

    return dates;
  }

  static String _fmt(DateTime dt) {
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
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '${dt.day} ${months[dt.month - 1]} ${dt.year} · $h.$m WIB';
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status, required this.label});

  final String status;
  final String label;

  bool get _positive =>
      status == 'APPROVED' ||
      status == 'GENERATED' ||
      status == 'SENT' ||
      status == 'approved' ||
      status == 'signed' ||
      status == 'sent';

  bool get _negative => status == 'REJECTED' || status == 'CANCELED';

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: _positive
            ? AppTheme.okBg
            : _negative
            ? AppTheme.dangerBg
            : AppTheme.warnBg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: _positive
              ? AppTheme.ok
              : _negative
              ? AppTheme.danger
              : AppTheme.warn,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _TimelineStep extends StatelessWidget {
  const _TimelineStep({
    this.done = false,
    this.isNow = false,
    this.isLast = false,
    required this.title,
    required this.subtitle,
  });

  final bool done;
  final bool isNow;
  final bool isLast;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final Color dotColor = isNow
        ? AppTheme.gold500
        : done
        ? AppTheme.g300
        : AppTheme.helperText;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: isNow
                    ? AppTheme.warnBg
                    : done
                    ? AppTheme.okBg
                    : AppTheme.g50,
                shape: BoxShape.circle,
                border: Border.all(color: dotColor, width: 2),
              ),
              child: (isNow || done)
                  ? Icon(
                      isNow ? Icons.access_time : Icons.check,
                      size: 12,
                      color: dotColor,
                    )
                  : null,
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 48,
                color: done ? AppTheme.g300 : AppTheme.g700,
              ),
          ],
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 2, bottom: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: isNow ? AppTheme.gold100 : AppTheme.g50,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: isNow ? AppTheme.gold500 : AppTheme.helperText,
                    fontWeight: isNow ? FontWeight.w600 : FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
