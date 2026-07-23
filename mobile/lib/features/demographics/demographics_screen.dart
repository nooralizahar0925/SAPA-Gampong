import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/demographic_block.dart';
import '../../data/providers/content_providers.dart';

class DemographicsScreen extends ConsumerWidget {
  const DemographicsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final blocksAsync = ref.watch(demographicsProvider);

    return SapaScaffold(
      title: 'Demografi',
      subtitle: 'Data umum Gampong Blang',
      leading: const SapaBackButton(),
      body: blocksAsync.when(
        loading: () => _buildBody(state: const _LoadingState()),
        error: (err, stack) => _buildBody(state: const _ErrorState()),
        data: (blocks) {
          final visible = blocks.where((b) => b.visible).toList()
            ..sort((a, b) => a.order.compareTo(b.order));
          return visible.isEmpty
              ? _buildBody(state: const _EmptyState())
              : _buildBody(blocks: visible);
        },
      ),
    );
  }

  static Widget _buildBody({
    List<DemographicBlock> blocks = const [],
    Widget? state,
  }) {
    return ListView(
      children: [
        const _InfoBanner(),
        const SizedBox(height: 14),
        if (state != null)
          state
        else
          for (final block in blocks) ...[
            _buildBlock(block),
            const SizedBox(height: 12),
          ],
        const _DevNote(),
        const SizedBox(height: 16),
      ],
    );
  }

  static Widget _buildBlock(DemographicBlock block) {
    switch (block.type) {
      case 'number':
        return _NumberCard(block: block);
      case 'split':
        return _SplitCard(block: block);
      case 'bar':
        return _BarCard(block: block);
      case 'pie':
        return _PieCard(block: block);
      default:
        return const SizedBox.shrink();
    }
  }
}

// ── Data-driven block renderers ───────────────────────────────────────────────

class _NumberCard extends StatelessWidget {
  const _NumberCard({required this.block});

  final DemographicBlock block;

  @override
  Widget build(BuildContext context) {
    final value = block.numberValue;
    final display = value != null ? '$value' : '—';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: Text(
                block.label,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            Text(
              display,
              key: Key('demo-number-${block.key}'),
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 28,
                color: AppTheme.g800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SplitCard extends StatelessWidget {
  const _SplitCard({required this.block});

  final DemographicBlock block;

  @override
  Widget build(BuildContext context) {
    final entries = block.entries;

    if (entries.isEmpty) return const SizedBox.shrink();

    final total = entries.fold<int>(0, (s, e) => s + e.$2);
    final firstFrac = total > 0 ? entries.first.$2 / total : 0.5;
    const colors = [AppTheme.g700, AppTheme.g200];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              block.label,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _DonutChart(
                  key: Key('demo-split-${block.key}'),
                  firstFraction: firstFrac,
                  total: total,
                ),
                const SizedBox(width: 24),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (var i = 0; i < entries.length; i++) ...[
                        _LegendRow(
                          color: colors[i % colors.length],
                          label: entries[i].$1,
                          value: '${entries[i].$2}',
                          pct: total > 0
                              ? '${(entries[i].$2 / total * 100).toStringAsFixed(1)}%'
                              : '—',
                        ),
                        if (i < entries.length - 1) const SizedBox(height: 12),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _BarCard extends StatelessWidget {
  const _BarCard({required this.block});

  final DemographicBlock block;

  static const _barColors = [
    AppTheme.g800,
    AppTheme.g600,
    AppTheme.g500,
    AppTheme.g400,
    AppTheme.g300,
  ];

  @override
  Widget build(BuildContext context) {
    final entries = block.entries;

    if (entries.isEmpty) return const SizedBox.shrink();

    final maxValue = entries.fold<int>(0, (m, e) => math.max(m, e.$2));
    final bars = [
      for (var i = 0; i < entries.length; i++)
        _Bar(entries[i].$1, entries[i].$2, _barColors[i % _barColors.length]),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              block.label,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 20),
            _BarChart(
              key: Key('demo-bar-${block.key}'),
              bars: bars,
              maxValue: maxValue > 0 ? maxValue : 1,
            ),
          ],
        ),
      ),
    );
  }
}

class _PieCard extends StatelessWidget {
  const _PieCard({required this.block});

  final DemographicBlock block;

  static const _hbarColors = [
    AppTheme.g700,
    AppTheme.g600,
    AppTheme.g500,
    AppTheme.g400,
    AppTheme.g300,
  ];

  @override
  Widget build(BuildContext context) {
    final entries = block.entries;

    if (entries.isEmpty) return const SizedBox.shrink();

    final maxValue = entries.fold<int>(0, (m, e) => math.max(m, e.$2));

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              block.label,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            for (var i = 0; i < entries.length; i++)
              _HBar(
                key: Key('demo-pie-${block.key}-$i'),
                label: entries[i].$1,
                value: entries[i].$2,
                max: maxValue > 0 ? maxValue : 1,
                color: _hbarColors[i % _hbarColors.length],
              ),
          ],
        ),
      ),
    );
  }
}

// ── Loading / empty / error states ────────────────────────────────────────────

class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return const _StateCard(
      key: Key('demo-loading-state'),
      icon: Icons.sync,
      title: 'Memuat data demografi',
      body: 'Mengambil data terbaru dari dashboard.',
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState();

  @override
  Widget build(BuildContext context) {
    return const _StateCard(
      key: Key('demo-error-state'),
      icon: Icons.cloud_off_outlined,
      title: 'Data demografi belum dapat dimuat',
      body:
          'Periksa koneksi aplikasi ke backend, lalu buka kembali halaman ini.',
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return const _StateCard(
      key: Key('demo-empty-state'),
      icon: Icons.bar_chart_outlined,
      title: 'Belum ada data demografi',
      body:
          'Tambahkan blok statistik dari dashboard agar tampil di aplikasi warga.',
    );
  }
}

class _StateCard extends StatelessWidget {
  const _StateCard({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: AppTheme.g50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: AppTheme.g700, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppTheme.ink900,
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    body,
                    style: const TextStyle(
                      color: AppTheme.ink500,
                      height: 1.45,
                      fontSize: 12.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Static chrome ─────────────────────────────────────────────────────────────

class _InfoBanner extends StatelessWidget {
  const _InfoBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.sky100,
        border: Border.all(color: AppTheme.sky500),
        borderRadius: BorderRadius.circular(10),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, size: 18, color: AppTheme.sky500),
          SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Data agregat',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AppTheme.sky500,
                    fontSize: 13,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Statistik umum, tidak memuat data pribadi warga. Sumber: RPJM Gampong Blang.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.sky500,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DevNote extends StatelessWidget {
  const _DevNote();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.g50,
        border: Border.all(color: AppTheme.g200),
        borderRadius: BorderRadius.circular(10),
      ),
      child: const Text(
        'Catatan: blok statistik bersifat data-driven — admin dapat menambah atau menyembunyikannya kapan saja.',
        style: TextStyle(
          fontSize: 12,
          color: AppTheme.g700,
          fontWeight: FontWeight.w600,
          height: 1.5,
        ),
      ),
    );
  }
}

// ── Donut chart ───────────────────────────────────────────────────────────────

class _DonutChart extends StatelessWidget {
  const _DonutChart({
    super.key,
    required this.firstFraction,
    required this.total,
  });

  final double firstFraction;
  final int total;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 110,
      height: 110,
      child: CustomPaint(
        painter: _DonutPainter(firstFraction: firstFraction),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _fmt(total),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.ink900,
                  height: 1,
                ),
              ),
              const SizedBox(height: 2),
              const Text(
                'JIWA',
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.ink500,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _fmt(int v) => v >= 1000
      ? '${(v / 1000).toStringAsFixed(1).replaceAll('.', ',')}K'
      : '$v';
}

class _DonutPainter extends CustomPainter {
  const _DonutPainter({required this.firstFraction});

  final double firstFraction;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 8;
    const strokeW = 14.0;

    final bgPaint = Paint()
      ..color = AppTheme.g200
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeW
      ..strokeCap = StrokeCap.round;

    final fgPaint = Paint()
      ..color = AppTheme.g700
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeW
      ..strokeCap = StrokeCap.round;

    final rect = Rect.fromCircle(center: center, radius: radius);
    canvas.drawArc(rect, 0, 2 * math.pi, false, bgPaint);

    const startAngle = -math.pi / 2;
    final sweepAngle = 2 * math.pi * firstFraction;
    canvas.drawArc(rect, startAngle, sweepAngle, false, fgPaint);
  }

  @override
  bool shouldRepaint(_DonutPainter old) => old.firstFraction != firstFraction;
}

// ── Legend row ────────────────────────────────────────────────────────────────

class _LegendRow extends StatelessWidget {
  const _LegendRow({
    required this.color,
    required this.label,
    required this.value,
    required this.pct,
  });

  final Color color;
  final String label;
  final String value;
  final String pct;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.ink500,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                '$value · $pct',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Vertical bar chart ────────────────────────────────────────────────────────

class _Bar {
  const _Bar(this.label, this.value, this.color);

  final String label;
  final int value;
  final Color color;
}

class _BarChart extends StatelessWidget {
  const _BarChart({super.key, required this.bars, required this.maxValue});

  final List<_Bar> bars;
  final int maxValue;

  @override
  Widget build(BuildContext context) {
    const chartH = 120.0;
    return Column(
      children: [
        SizedBox(
          height: chartH,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: bars.map((bar) {
              final frac = bar.value / maxValue;
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        '${bar.value}',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.ink700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      ClipRRect(
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(6),
                        ),
                        child: Container(
                          height: chartH * frac * 0.85,
                          color: bar.color,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: bars
              .map(
                (bar) => Expanded(
                  child: Text(
                    bar.label,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.ink700,
                    ),
                  ),
                ),
              )
              .toList(),
        ),
      ],
    );
  }
}

// ── Horizontal bar ────────────────────────────────────────────────────────────

class _HBar extends StatelessWidget {
  const _HBar({
    super.key,
    required this.label,
    required this.value,
    required this.max,
    required this.color,
  });

  final String label;
  final int value;
  final int max;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.ink700,
                ),
              ),
              Text(
                '$value',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: value / max,
              minHeight: 9,
              color: color,
              backgroundColor: AppTheme.g100,
            ),
          ),
        ],
      ),
    );
  }
}
