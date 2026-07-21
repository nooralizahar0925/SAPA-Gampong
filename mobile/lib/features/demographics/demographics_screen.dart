import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/mock/village_seed.dart';

class DemographicsScreen extends StatelessWidget {
  const DemographicsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final male = demographics['male']!;
    final female = demographics['female']!;
    final total = demographics['total']!;

    return SapaScaffold(
      title: 'Demografi',
      subtitle: 'Data umum Gampong Blang',
      leading: const SapaBackButton(),
      body: ListView(
        children: [
          // Info alert
          Container(
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
          ),
          const SizedBox(height: 14),

          // Population card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Jumlah Penduduk',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _DonutChart(
                        male: male,
                        female: female,
                        total: total,
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _LegendRow(
                              color: AppTheme.g700,
                              label: 'Laki-laki',
                              value: '$male',
                              pct:
                                  '${(male / total * 100).toStringAsFixed(1)}%',
                            ),
                            const SizedBox(height: 12),
                            _LegendRow(
                              color: AppTheme.g200,
                              label: 'Perempuan',
                              value: '$female',
                              pct:
                                  '${(female / total * 100).toStringAsFixed(1)}%',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Divider(height: 1),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Jumlah Keluarga (KK)',
                        style: TextStyle(
                          color: AppTheme.ink500,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        '${demographics['kk']}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 17,
                          color: AppTheme.ink900,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Education bar chart
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Tingkat Pendidikan',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Total tercatat: 507 jiwa',
                    style: TextStyle(fontSize: 12, color: AppTheme.ink500),
                  ),
                  const SizedBox(height: 20),
                  _BarChart(
                    bars: const [
                      _Bar('SD', 193, AppTheme.g800),
                      _Bar('SLTP', 54, AppTheme.g600),
                      _Bar('SLTA', 110, AppTheme.g500),
                      _Bar('D1–D3', 60, AppTheme.g400),
                      _Bar('S-1', 90, AppTheme.g300),
                    ],
                    maxValue: 200,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Livelihood horizontal bars
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Mata Pencaharian',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 16),
                  const _HBar('Buruh Tani', 371, 1088, AppTheme.g700),
                  const _HBar('Swasta', 117, 1088, AppTheme.g600),
                  const _HBar('Dagang', 90, 1088, AppTheme.g500),
                  const _HBar('Tani', 85, 1088, AppTheme.g400),
                  const _HBar('PNS / TNI / Polri', 70, 1088, AppTheme.g300),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Religion stacked bar
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Agama',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 14),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 1514,
                          child: Container(height: 14, color: AppTheme.g700),
                        ),
                        Expanded(
                          flex: 3,
                          child: Container(
                            height: 14,
                            color: AppTheme.sky500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _ReligionLegend(
                        color: AppTheme.g700,
                        label: 'Islam',
                        value: '1.514',
                      ),
                      const SizedBox(width: 20),
                      _ReligionLegend(
                        color: AppTheme.sky500,
                        label: 'Kristen',
                        value: '3',
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Dev note
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.g50,
              border: Border.all(color: AppTheme.g200),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Text(
              'Catatan: distribusi umur (0–17 … 65+) belum tersedia pada RPJM. Blok statistik bersifat data-driven — admin dapat menambah atau menyembunyikannya kapan saja.',
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.g700,
                fontWeight: FontWeight.w600,
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

// ── Donut chart ──────────────────────────────────────────────────────────────

class _DonutChart extends StatelessWidget {
  const _DonutChart({
    required this.male,
    required this.female,
    required this.total,
  });

  final int male;
  final int female;
  final int total;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 110,
      height: 110,
      child: CustomPaint(
        painter: _DonutPainter(maleFraction: male / total),
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

  static String _fmt(int v) =>
      v >= 1000 ? '${(v / 1000).toStringAsFixed(1).replaceAll('.', ',')}K' : '$v';
}

class _DonutPainter extends CustomPainter {
  const _DonutPainter({required this.maleFraction});

  final double maleFraction;

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
    final sweepAngle = 2 * math.pi * maleFraction;
    canvas.drawArc(rect, startAngle, sweepAngle, false, fgPaint);
  }

  @override
  bool shouldRepaint(_DonutPainter old) => old.maleFraction != maleFraction;
}

// ── Legend row ───────────────────────────────────────────────────────────────

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

// ── Education bar chart ───────────────────────────────────────────────────────

class _Bar {
  const _Bar(this.label, this.value, this.color);

  final String label;
  final int value;
  final Color color;
}

class _BarChart extends StatelessWidget {
  const _BarChart({required this.bars, required this.maxValue});

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
  const _HBar(this.label, this.value, this.max, this.color);

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

// ── Religion legend ───────────────────────────────────────────────────────────

class _ReligionLegend extends StatelessWidget {
  const _ReligionLegend({
    required this.color,
    required this.label,
    required this.value,
  });

  final Color color;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 11,
          height: 11,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 7),
        Text(
          '$label ',
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        ),
        Text(
          value,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
        ),
      ],
    );
  }
}
