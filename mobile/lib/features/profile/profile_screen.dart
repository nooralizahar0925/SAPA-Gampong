import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/mock/village_seed.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Profil Desa',
      subtitle: 'Gampong Blang',
      leading: const SapaBackButton(),
      body: ListView(
        children: [
          Container(
            height: 170,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: const LinearGradient(
                colors: [AppTheme.deepGreen, AppTheme.villageGreen],
              ),
            ),
            child: const Align(
              alignment: Alignment.bottomLeft,
              child: Text(
                'Gampong Blang',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
          const SectionTitle('Tentang Desa'),
          const Text(villageDescription, style: TextStyle(height: 1.6)),
          const SectionTitle('Fakta Kunci'),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  for (final fact in villageFacts) _FactRow(fact.$1, fact.$2),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.map_outlined),
            label: const Text('Lokasi Kantor Desa'),
          ),
          const SectionTitle('Visi'),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(vision, style: TextStyle(height: 1.55)),
            ),
          ),
          const SectionTitle('Misi'),
          for (var index = 0; index < missions.length; index++)
            Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: const Color(0xFFDCEDE4),
                  child: Text('${index + 1}'),
                ),
                title: Text(missions[index]),
              ),
            ),
          const SectionTitle('Perangkat Gampong'),
          for (final official in officials)
            SapaListTile(
              icon: official.$2 == 'Keuchik'
                  ? Icons.workspace_premium_outlined
                  : Icons.person_outline,
              title: official.$1,
              subtitle: official.$2,
              trailing: const SizedBox.shrink(),
            ),
          const SectionTitle('Potensi Keunggulan Desa'),
          for (final strength in strengths)
            SapaListTile(
              icon: Icons.eco_outlined,
              title: strength.$1,
              subtitle: strength.$2,
              trailing: const SizedBox.shrink(),
            ),
        ],
      ),
    );
  }
}

class _FactRow extends StatelessWidget {
  const _FactRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(color: Color(0xFF667069)),
            ),
          ),
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
