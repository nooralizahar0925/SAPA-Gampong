import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/localization/strings_id.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/mock/village_seed.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: StringsId.appName,
      subtitle: villageSubtitle,
      selectedIndex: 0,
      actions: [
        IconButton(
          tooltip: 'Pengaturan',
          onPressed: () => context.goNamed(AppRouteNames.settings),
          icon: const Icon(Icons.more_vert),
        ),
      ],
      body: ListView(
        children: [
          const _BannerCard(),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              _Dot(active: true),
              _Dot(),
              _Dot(),
              _Dot(),
            ],
          ),
          const SizedBox(height: 18),
          _PrimaryActionCard(
            key: const Key('home-letter-request'),
            onTap: () => context.pushNamed(AppRouteNames.letterCatalog),
          ),
          const SectionTitle('Layanan Lainnya'),
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.18,
            children: [
              _FeatureTile(
                key: const Key('home-profile'),
                icon: Icons.account_balance_outlined,
                title: StringsId.villageProfile,
                subtitle: 'Sejarah, visi & perangkat',
                onTap: () => context.pushNamed(AppRouteNames.profile),
              ),
              _FeatureTile(
                key: const Key('home-demographics'),
                icon: Icons.bar_chart_outlined,
                title: StringsId.demographics,
                subtitle: 'Statistik umum desa',
                onTap: () => context.pushNamed(AppRouteNames.demographics),
              ),
              _FeatureTile(
                key: const Key('home-prayer'),
                icon: Icons.access_time_outlined,
                title: StringsId.prayerSchedule,
                subtitle: '5 waktu + alarm azan',
                onTap: () => context.pushNamed(AppRouteNames.prayer),
              ),
              _FeatureTile(
                key: const Key('home-feedback'),
                icon: Icons.campaign_outlined,
                title: StringsId.feedback,
                subtitle: 'Sampaikan laporan warga',
                onTap: () => context.pushNamed(AppRouteNames.feedback),
              ),
            ],
          ),
          const SectionTitle('Permohonan Anda'),
          SapaListTile(
            icon: Icons.hourglass_top_outlined,
            title: 'SKTM · BLG-2K7F9',
            subtitle: 'Diajukan 18 Juli 2026',
            onTap: () => context.pushNamed(AppRouteNames.tracking),
            trailing: const _StatusPill('Ditinjau', AppTheme.warnBg, AppTheme.warn),
          ),
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () => context.pushNamed(AppRouteNames.myRequests),
              child: const Text('Lihat semua'),
            ),
          ),
        ],
      ),
    );
  }
}

class _BannerCard extends StatelessWidget {
  const _BannerCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 176,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          colors: [AppTheme.deepGreen, AppTheme.villageGreen],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppTheme.accentYellow,
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text(
              'PENGUMUMAN',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Gotong Royong Jumat\n07.00 WIB · Dusun Kuini',
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w800,
              height: 1.25,
            ),
          ),
        ],
      ),
    );
  }
}

class _PrimaryActionCard extends StatelessWidget {
  const _PrimaryActionCard({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppTheme.villageGreen,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: const [
              _PrimaryIcon(),
              SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      StringsId.letterRequest,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      '10 jenis surat keterangan resmi',
                      style: TextStyle(color: Color(0xFFCDEBDD), fontSize: 13),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}

class _PrimaryIcon extends StatelessWidget {
  const _PrimaryIcon();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(14),
      ),
      child: const Icon(Icons.description_outlined, color: Colors.white),
    );
  }
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppTheme.line),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppTheme.g50,
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(icon, color: AppTheme.g700, size: 22),
              ),
              const Spacer(),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 14.5,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 11.5, color: AppTheme.ink500, height: 1.4),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({this.active = false});

  final bool active;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: active ? 20 : 7,
      height: 7,
      margin: const EdgeInsets.symmetric(horizontal: 3),
      decoration: BoxDecoration(
        color: active ? AppTheme.accentYellow : AppTheme.g300,
        borderRadius: BorderRadius.circular(999),
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
