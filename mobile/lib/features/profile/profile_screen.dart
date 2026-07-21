import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/mock/village_seed.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: AppTheme.bg,
        appBar: AppBar(
          leading: const SapaBackButton(),
          titleSpacing: 0,
          title: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Profil Desa',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
              ),
              Text(
                'Gampong Blang',
                style: TextStyle(fontSize: 11, color: AppTheme.ink500, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          bottom: const TabBar(
            labelColor: AppTheme.g800,
            unselectedLabelColor: AppTheme.ink400,
            indicatorColor: AppTheme.g800,
            indicatorWeight: 2.5,
            labelStyle: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            tabs: [
              Tab(text: 'Tentang'),
              Tab(text: 'Visi & Misi'),
              Tab(text: 'Perangkat'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _TentangTab(),
            _VisiMisiTab(),
            _PerangkatTab(),
          ],
        ),
      ),
    );
  }
}

// ── Tab 1: Tentang ────────────────────────────────────────────────────────────

class _TentangTab extends StatelessWidget {
  const _TentangTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Village photo placeholder
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Container(
            height: 168,
            width: double.infinity,
            color: AppTheme.g100,
            child: const Icon(Icons.image_outlined, size: 48, color: AppTheme.g400),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Gampong Blang',
          style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: AppTheme.ink900),
        ),
        const SizedBox(height: 4),
        const Text(
          'Kemukiman Calang · Kec. Krueng Sabee · Kab. Aceh Jaya',
          style: TextStyle(color: AppTheme.ink500, fontWeight: FontWeight.w600, fontSize: 13),
        ),
        const SizedBox(height: 14),
        const Text(villageDescription, style: TextStyle(height: 1.65, color: AppTheme.ink700)),
        const SizedBox(height: 16),
        // Facts card
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
        const SizedBox(height: 14),
        FilledButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.map_outlined),
          label: const Text('Lokasi Kantor Desa'),
        ),
        // Batas Wilayah
        _SectionLabel('Batas Wilayah'),
        GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 2.4,
          children: const [
            _BoundaryCard('UTARA', 'Panton Makmur'),
            _BoundaryCard('TIMUR', 'Dayah Baro'),
            _BoundaryCard('BARAT', 'Sentosa'),
            _BoundaryCard('SELATAN', 'Samudra Hindia'),
          ],
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}

// ── Tab 2: Visi & Misi ────────────────────────────────────────────────────────

class _VisiMisiTab extends StatelessWidget {
  const _VisiMisiTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionLabel('Visi & Misi'),
        // Visi dark green card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.g800,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'VISI',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.gold500,
                  letterSpacing: 1.5,
                ),
              ),
              SizedBox(height: 10),
              Text(
                '"$vision"',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  height: 1.55,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Misi card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'MISI',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.g700,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 12),
                for (var i = 0; i < missions.length; i++) ...[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 22,
                        height: 22,
                        margin: const EdgeInsets.only(top: 1, right: 10),
                        decoration: BoxDecoration(
                          color: AppTheme.g100,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            '${i + 1}',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.g800,
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          missions[i],
                          style: const TextStyle(
                            fontSize: 13.5,
                            height: 1.5,
                            color: AppTheme.ink700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (i < missions.length - 1) const SizedBox(height: 10),
                ],
              ],
            ),
          ),
        ),
        _SectionLabel('Pemimpin'),
        GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.1,
          children: const [
            _LeaderCard('Sofian', 'Keuchik'),
            _LeaderCard('Afzalul Zikri', 'Sekretaris Gampong'),
          ],
        ),
        const SizedBox(height: 16),
        _SectionLabel('Potensi Keunggulan Desa'),
        for (final s in strengths)
          Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              leading: Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppTheme.g50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.eco_outlined, color: AppTheme.g700),
              ),
              title: Text(
                s.$1,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
              ),
              subtitle: Text(s.$2),
              trailing: const SizedBox.shrink(),
            ),
          ),
        const SizedBox(height: 16),
      ],
    );
  }
}

// ── Tab 3: Perangkat ─────────────────────────────────────────────────────────

class _PerangkatTab extends StatelessWidget {
  const _PerangkatTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionLabel('Perangkat Gampong'),
        for (final official in officials)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Card(
              child: ListTile(
                minLeadingWidth: 42,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                leading: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: official.$2 == 'Keuchik'
                        ? AppTheme.g100
                        : AppTheme.g50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    official.$2 == 'Keuchik'
                        ? Icons.workspace_premium_outlined
                        : Icons.person_outline,
                    color: official.$2 == 'Keuchik'
                        ? AppTheme.g700
                        : AppTheme.g500,
                  ),
                ),
                title: Text(
                  official.$1,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5),
                ),
                subtitle: Text(official.$2),
                trailing: const SizedBox.shrink(),
              ),
            ),
          ),
        const SizedBox(height: 16),
      ],
    );
  }
}

// ── Shared widgets ────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 20, bottom: 12),
      child: Text(
        text,
        style: const TextStyle(
          fontWeight: FontWeight.w800,
          fontSize: 15,
          color: AppTheme.g900,
        ),
      ),
    );
  }
}

class _BoundaryCard extends StatelessWidget {
  const _BoundaryCard(this.direction, this.name);

  final String direction;
  final String name;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              direction,
              style: const TextStyle(
                fontSize: 10,
                color: AppTheme.ink500,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              name,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class _LeaderCard extends StatelessWidget {
  const _LeaderCard(this.name, this.role);

  final String name;
  final String role;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: AppTheme.g100,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.person, size: 28, color: AppTheme.g700),
            ),
            const SizedBox(height: 10),
            Text(
              name,
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
            ),
            const SizedBox(height: 3),
            Text(
              role,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11.5, color: AppTheme.ink500),
            ),
          ],
        ),
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
            child: Text(label, style: const TextStyle(color: AppTheme.ink500)),
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
