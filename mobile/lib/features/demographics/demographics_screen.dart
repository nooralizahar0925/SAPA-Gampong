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
          Row(
            children: [
              Expanded(child: _StatCard('Jumlah Penduduk', '$total', 'jiwa')),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  'Jumlah Keluarga',
                  '${demographics['kk']}',
                  'KK',
                ),
              ),
            ],
          ),
          const SectionTitle('Jenis Kelamin'),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _BarRow('Laki-laki', male, total),
                  _BarRow('Perempuan', female, total),
                ],
              ),
            ),
          ),
          const SectionTitle('Pendidikan'),
          for (final stat in educationStats) _BarRowCard(stat.$1, stat.$2, 193),
          const SectionTitle('Mata Pencaharian'),
          for (final stat in livelihoodStats)
            _BarRowCard(stat.$1, stat.$2, 1088),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard(this.label, this.value, this.unit);

  final String label;
  final String value;
  final String unit;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Color(0xFF667069))),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900),
            ),
            Text(unit),
          ],
        ),
      ),
    );
  }
}

class _BarRowCard extends StatelessWidget {
  const _BarRowCard(this.label, this.value, this.max);

  final String label;
  final int value;
  final int max;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: _BarRow(label, value, max),
      ),
    );
  }
}

class _BarRow extends StatelessWidget {
  const _BarRow(this.label, this.value, this.max);

  final String label;
  final int value;
  final int max;

  @override
  Widget build(BuildContext context) {
    final factor = max == 0 ? 0.0 : value / max;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              Text(
                '$value',
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: factor.clamp(0, 1),
              minHeight: 10,
              color: AppTheme.villageGreen,
              backgroundColor: const Color(0xFFDCEDE4),
            ),
          ),
        ],
      ),
    );
  }
}
