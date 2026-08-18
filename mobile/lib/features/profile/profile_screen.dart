import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/cached_api_image.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/mock/village_seed.dart' as seed;
import '../../data/models/official.dart';
import '../../data/models/village_profile.dart';
import '../../data/models/village_strength.dart';
import '../../data/models/vision_mission.dart';
import '../../data/providers/cache_providers.dart';
import '../../data/providers/content_providers.dart';
import '../../data/services/content_cache_service.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: AppTheme.shell,
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
                style: TextStyle(
                  fontSize: 11,
                  color: AppTheme.g100,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          bottom: const TabBar(
            labelColor: AppTheme.gold500,
            unselectedLabelColor: AppTheme.g100,
            indicatorColor: AppTheme.gold500,
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
          children: [_TentangTab(), _VisiMisiTab(), _PerangkatTab()],
        ),
      ),
    );
  }
}

// ── Tab 1: Tentang ────────────────────────────────────────────────────────────

class _TentangTab extends ConsumerWidget {
  const _TentangTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(villageProfileProvider);
    final cachedAt = ref
        .watch(contentCacheServiceProvider)
        .updatedAt(ContentCacheKeys.profile);

    return profileAsync.when(
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppTheme.gold500),
      ),
      error: (_, _) => const _TentangContent(profile: null),
      data: (profile) => _TentangContent(profile: profile, cachedAt: cachedAt),
    );
  }
}

class _TentangContent extends StatelessWidget {
  const _TentangContent({required this.profile, this.cachedAt});

  final VillageProfile? profile;
  final DateTime? cachedAt;

  @override
  Widget build(BuildContext context) {
    final description = profile?.description ?? seed.villageDescription;
    final facts = _buildFacts(profile);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: profile?.photoUrl != null
              ? CachedApiImage(
                  url: profile!.photoUrl,
                  cacheKey: profile!.photoFileId,
                  height: 168,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  fallback: const _PhotoPlaceholder(),
                )
              : const _PhotoPlaceholder(),
        ),
        const SizedBox(height: 16),
        Text(
          profile?.name ?? seed.villageName,
          key: const Key('profile-village-name'),
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          _locationSubtitle(profile),
          style: const TextStyle(
            color: AppTheme.g100,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
        if (cachedAt != null) ...[
          const SizedBox(height: 8),
          _UpdatedAtNote(updatedAt: cachedAt!),
        ],
        const SizedBox(height: 14),
        Text(
          description,
          key: const Key('profile-description'),
          style: const TextStyle(height: 1.65, color: AppTheme.g100),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [for (final fact in facts) _FactRow(fact.$1, fact.$2)],
            ),
          ),
        ),
        const SizedBox(height: 14),
        FilledButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.map_outlined),
          label: const Text('Lokasi Kantor Desa'),
        ),
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

  static String _locationSubtitle(VillageProfile? p) {
    if (p == null) {
      return 'Kemukiman Calang · Kec. Krueng Sabee · Kab. Aceh Jaya';
    }
    final parts = <String>[
      if (p.kemukiman != null) 'Kemukiman ${p.kemukiman}',
      if (p.kecamatan != null) 'Kec. ${p.kecamatan}',
      if (p.kabupaten != null) 'Kab. ${p.kabupaten}',
    ];
    return parts.isEmpty
        ? 'Kemukiman Calang · Kec. Krueng Sabee · Kab. Aceh Jaya'
        : parts.join(' · ');
  }

  static List<(String, String)> _buildFacts(VillageProfile? p) {
    if (p == null) return seed.villageFacts;
    return [
      ('Nama Desa', p.name ?? seed.villageName),
      if (p.kemukiman != null) ('Kemukiman', p.kemukiman!),
      if (p.kecamatan != null) ('Kecamatan', p.kecamatan!),
      if (p.kabupaten != null) ('Kabupaten', p.kabupaten!),
      if (p.areaSize != null) ('Luas Wilayah', p.areaSize!),
      if (p.elevation != null) ('Ketinggian', p.elevation!),
    ];
  }
}

class _UpdatedAtNote extends StatelessWidget {
  const _UpdatedAtNote({required this.updatedAt});

  final DateTime updatedAt;

  @override
  Widget build(BuildContext context) {
    return Text(
      'Diperbarui ${_format(updatedAt)}',
      key: const Key('profile-cache-note'),
      style: const TextStyle(
        color: AppTheme.g100,
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  static String _format(DateTime value) {
    final local = value.toLocal();
    final day = local.day.toString().padLeft(2, '0');
    final month = local.month.toString().padLeft(2, '0');
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '$day/$month/${local.year} $hour:$minute';
  }
}

class _PhotoPlaceholder extends StatelessWidget {
  const _PhotoPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 168,
      width: double.infinity,
      color: AppTheme.g100,
      child: const Icon(Icons.image_outlined, size: 48, color: AppTheme.g400),
    );
  }
}

// ── Tab 2: Visi & Misi ────────────────────────────────────────────────────────

class _VisiMisiTab extends ConsumerWidget {
  const _VisiMisiTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vmAsync = ref.watch(visionMissionProvider);
    final officialsAsync = ref.watch(officialsProvider);
    final strengthsAsync = ref.watch(strengthsProvider);

    final isLoading =
        vmAsync.isLoading ||
        officialsAsync.isLoading ||
        strengthsAsync.isLoading;
    if (isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppTheme.gold500),
      );
    }

    return _VisiMisiContent(
      vm: vmAsync.asData?.value,
      officials: officialsAsync.asData?.value,
      strengths: strengthsAsync.asData?.value,
    );
  }
}

class _VisiMisiContent extends StatelessWidget {
  const _VisiMisiContent({
    required this.vm,
    required this.officials,
    required this.strengths,
  });

  final VisionMission? vm;
  final List<Official>? officials;
  final List<VillageStrength>? strengths;

  @override
  Widget build(BuildContext context) {
    final visionText = vm?.vision ?? seed.vision;
    final missionList = (vm?.missions.isNotEmpty == true)
        ? vm!.missions
        : seed.missions;
    final leaders = officials?.where((o) => o.isLeadershipHighlight).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionLabel('Visi & Misi'),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.g800,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'VISI',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.gold500,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                '"$visionText"',
                key: const Key('profile-vision-text'),
                style: const TextStyle(
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
                for (var i = 0; i < missionList.length; i++) ...[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 22,
                        height: 22,
                        margin: const EdgeInsets.only(top: 1, right: 10),
                        decoration: const BoxDecoration(
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
                          missionList[i],
                          style: const TextStyle(
                            fontSize: 13.5,
                            height: 1.5,
                            color: AppTheme.ink700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (i < missionList.length - 1) const SizedBox(height: 10),
                ],
              ],
            ),
          ),
        ),
        _SectionLabel('Pemimpin'),
        if (leaders != null && leaders.isNotEmpty)
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.1,
            children: [for (final l in leaders) _LeaderCard(l.name, l.role)],
          )
        else
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
        _SectionLabel('Potensi Keunggulan Desa'),
        if (strengths != null && strengths!.isNotEmpty)
          for (final s in strengths!)
            Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                key: Key('strength-${s.id}'),
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
                  s.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
                subtitle: Text(s.body),
                trailing: const SizedBox.shrink(),
              ),
            )
        else
          for (final s in seed.strengths)
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
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
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

class _PerangkatTab extends ConsumerWidget {
  const _PerangkatTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final officialsAsync = ref.watch(officialsProvider);

    return officialsAsync.when(
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppTheme.gold500),
      ),
      error: (_, _) => const _PerangkatList(officials: null),
      data: (officials) => _PerangkatList(officials: officials),
    );
  }
}

class _PerangkatList extends StatelessWidget {
  const _PerangkatList({required this.officials});

  final List<Official>? officials;

  @override
  Widget build(BuildContext context) {
    final list = officials;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionLabel('Perangkat Gampong'),
        if (list != null && list.isNotEmpty)
          for (final official in list)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                child: ListTile(
                  key: Key('official-${official.id}'),
                  minLeadingWidth: 42,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 6,
                  ),
                  leading: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: official.isLeadershipHighlight
                          ? AppTheme.g100
                          : AppTheme.g50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      official.isLeadershipHighlight
                          ? Icons.workspace_premium_outlined
                          : Icons.person_outline,
                      color: official.isLeadershipHighlight
                          ? AppTheme.g700
                          : AppTheme.g500,
                    ),
                  ),
                  title: Text(
                    official.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14.5,
                    ),
                  ),
                  subtitle: Text(official.role),
                  trailing: const SizedBox.shrink(),
                ),
              ),
            )
        else
          for (final official in seed.officials)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                child: ListTile(
                  minLeadingWidth: 42,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 6,
                  ),
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
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14.5,
                    ),
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
          color: Colors.white,
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
              decoration: const BoxDecoration(
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
