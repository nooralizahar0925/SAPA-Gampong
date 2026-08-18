import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/localization/strings_id.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/cached_api_image.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/mock/village_seed.dart';
import '../../data/models/banner_slide.dart';
import '../../data/providers/content_providers.dart';
import '../../data/providers/letter_providers.dart';
import '../../data/providers/resident_providers.dart';
import '../services/services_screen.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bannersAsync = ref.watch(bannersProvider);
    final letterTypesAsync = ref.watch(letterTypesProvider);

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
          bannersAsync.when(
            loading: () => const _FallbackBanner(),
            error: (err, stack) => const _FallbackBanner(),
            data: (slides) {
              final active = slides.where((s) => s.active).toList();
              return active.isEmpty
                  ? const _FallbackBanner()
                  : _BannerCarousel(slides: active);
            },
          ),
          const SizedBox(height: 16),
          _PrimaryActionCard(
            key: const Key('home-letter-request'),
            subtitle: letterTypeCountLabel(
              letterTypesAsync,
              suffix: 'surat keterangan resmi',
            ),
            onTap: () => context.pushNamed(AppRouteNames.letterCatalog),
          ),
          const SectionTitle('Layanan Lainnya'),
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.05,
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
          const _AnnouncementCarousel(),
          const _HomeRequestsSection(),
        ],
      ),
    );
  }
}

class _HomeRequestsSection extends ConsumerStatefulWidget {
  const _HomeRequestsSection();

  @override
  ConsumerState<_HomeRequestsSection> createState() =>
      _HomeRequestsSectionState();
}

class _HomeRequestsSectionState extends ConsumerState<_HomeRequestsSection>
    with WidgetsBindingObserver {
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      unawaited(_refreshHistory());
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_refreshHistory());
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
      unawaited(_refreshHistory());
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(residentSessionProvider).asData?.value;
    final requestsAsync = ref.watch(residentRequestsProvider);
    final feedbackAsync = ref.watch(residentFeedbackProvider);
    final requests = requestsAsync.asData?.value ?? const [];
    final feedback = feedbackAsync.asData?.value ?? const [];
    final loading =
        (requestsAsync.isLoading && requests.isEmpty) ||
        (feedbackAsync.isLoading && feedback.isEmpty);
    final hasAnyError = requestsAsync.hasError || feedbackAsync.hasError;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle('Permohonan Anda'),
        if (session == null)
          SapaListTile(
            icon: Icons.mark_email_unread_outlined,
            title: 'Verifikasi email',
            subtitle:
                'Riwayat permohonan dan laporan akan tampil setelah email tersimpan.',
            onTap: () => context.pushNamed(AppRouteNames.settings),
          )
        else if (loading)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(14),
              child: Row(
                children: [
                  SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  SizedBox(width: 10),
                  Text('Memuat riwayat...'),
                ],
              ),
            ),
          )
        else if (requests.isEmpty && feedback.isEmpty)
          SapaListTile(
            icon: hasAnyError ? Icons.wifi_off_outlined : Icons.inbox_outlined,
            title: hasAnyError
                ? 'Riwayat belum bisa dimuat'
                : 'Belum ada permohonan atau laporan',
            subtitle: hasAnyError
                ? 'Coba lagi saat koneksi tersedia.'
                : 'Aktivitas baru akan tampil di sini.',
            onTap: () => context.pushNamed(AppRouteNames.myRequests),
          )
        else ...[
          if (requests.isNotEmpty)
            Builder(
              builder: (context) {
                final latest = requests.first;
                final colors = _homeStatusColors(latest.status);
                return _HomeHistoryCard(
                  key: const Key('home-latest-request'),
                  icon: Icons.description_outlined,
                  title: latest.referenceCode,
                  subtitle:
                      '${latest.letterType} · ${_homeDate(latest.createdAt)}',
                  onTap: () => context.pushNamed(AppRouteNames.myRequests),
                  badge: _StatusPill(
                    key: const Key('home-latest-request-status'),
                    latest.statusLabel,
                    colors.$1,
                    colors.$2,
                  ),
                );
              },
            ),
          if (feedback.isNotEmpty)
            Builder(
              builder: (context) {
                final latest = feedback.first;
                final colors = _homeFeedbackStatusColors(latest.status);
                return _HomeHistoryCard(
                  key: const Key('home-latest-feedback'),
                  icon: Icons.campaign_outlined,
                  title: latest.referenceCode,
                  subtitle: 'Laporan warga · ${_homeDate(latest.createdAt)}',
                  onTap: () => context.pushNamed(AppRouteNames.myFeedback),
                  badge: _StatusPill(
                    key: const Key('home-latest-feedback-status'),
                    _homeFeedbackStatusLabel(latest.status),
                    colors.$1,
                    colors.$2,
                  ),
                );
              },
            ),
          if (hasAnyError)
            const Padding(
              padding: EdgeInsets.only(top: 2, left: 4, right: 4),
              child: Text(
                'Sebagian riwayat belum bisa disegarkan.',
                style: TextStyle(
                  color: AppTheme.ink500,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
        const SizedBox(height: 4),
        if (session != null)
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: () => context.pushNamed(AppRouteNames.myRequests),
                style: TextButton.styleFrom(foregroundColor: AppTheme.gold500),
                child: const Text('Lihat surat'),
              ),
              TextButton(
                onPressed: () => context.pushNamed(AppRouteNames.myFeedback),
                style: TextButton.styleFrom(foregroundColor: AppTheme.gold500),
                child: const Text('Lihat laporan'),
              ),
            ],
          )
        else
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () => context.pushNamed(AppRouteNames.myRequests),
              style: TextButton.styleFrom(foregroundColor: AppTheme.gold500),
              child: const Text('Lihat semua'),
            ),
          ),
      ],
    );
  }

  Future<void> _refreshHistory() async {
    if (!mounted) return;
    final session = ref.read(residentSessionProvider).asData?.value;
    if (session == null) return;

    ref.invalidate(residentRequestsProvider);
    ref.invalidate(residentFeedbackProvider);
    try {
      await Future.wait([
        ref.read(residentRequestsProvider.future),
        ref.read(residentFeedbackProvider.future),
      ]);
    } catch (_) {
      // Keep the cached history visible if staging/API is temporarily down.
    }
  }
}

class _HomeHistoryCard extends StatelessWidget {
  const _HomeHistoryCard({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.badge,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget badge;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Align(alignment: Alignment.centerRight, child: badge),
              const SizedBox(height: 10),
              Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: AppTheme.gold500,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, color: AppTheme.ink900),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            height: 1.15,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          subtitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppTheme.ink500,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Static fallback shown while loading or on error.
class _FallbackBanner extends StatelessWidget {
  const _FallbackBanner();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          key: const Key('home-banner-fallback'),
          height: 176,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: const LinearGradient(
              colors: [AppTheme.gold500, AppTheme.gold100],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                right: -10,
                bottom: -16,
                child: Opacity(
                  opacity: 0.16,
                  child: Image.asset(
                    'assets/images/logo.webp',
                    height: 138,
                    width: 138,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              const Align(
                alignment: Alignment.bottomLeft,
                child: SizedBox(
                  width: 250,
                  child: Text(
                    'Gampong Blang Digital',
                    style: TextStyle(
                      color: AppTheme.ink900,
                      fontSize: 25,
                      fontWeight: FontWeight.w900,
                      height: 1.1,
                    ),
                  ),
                ),
              ),
              const Align(
                alignment: Alignment.topLeft,
                child: Text(
                  'Banner informasi gampong',
                  style: TextStyle(
                    color: AppTheme.ink700,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [_Dot(active: true)],
        ),
      ],
    );
  }
}

class _BannerCarousel extends StatefulWidget {
  const _BannerCarousel({required this.slides});

  final List<BannerSlide> slides;

  @override
  State<_BannerCarousel> createState() => _BannerCarouselState();
}

class _BannerCarouselState extends State<_BannerCarousel> {
  late final PageController _pageController;
  int _current = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    if (widget.slides.length > 1) {
      _timer = Timer.periodic(const Duration(seconds: 5), (_) {
        final next = (_current + 1) % widget.slides.length;
        _pageController.animateToPage(
          next,
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeInOut,
        );
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          key: const Key('home-banner-carousel'),
          height: 176,
          child: PageView.builder(
            controller: _pageController,
            itemCount: widget.slides.length,
            onPageChanged: (i) => setState(() => _current = i),
            itemBuilder: (_, i) => _BannerCard(slide: widget.slides[i]),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            widget.slides.length,
            (i) => _Dot(active: i == _current),
          ),
        ),
      ],
    );
  }
}

class _BannerCard extends StatelessWidget {
  const _BannerCard({required this.slide});

  final BannerSlide slide;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: 176,
        width: double.infinity,
        child: slide.imageUrl != null
            ? CachedApiImage(
                url: slide.imageUrl,
                cacheKey: slide.imageFileId,
                height: 176,
                width: double.infinity,
                fit: BoxFit.cover,
                fallback: _gradientBox(),
              )
            : _gradientBox(),
      ),
    );
  }

  Widget _gradientBox() => Container(
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        colors: [AppTheme.gold500, AppTheme.gold100],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
    ),
  );
}

class _AnnouncementSlide {
  const _AnnouncementSlide({
    required this.badge,
    required this.title,
    required this.body,
  });

  final String badge;
  final String title;
  final String body;
}

const _announcementPlaceholders = [
  _AnnouncementSlide(
    badge: 'PENGUMUMAN',
    title: 'Fitur pengumuman sedang dikembangkan',
    body: 'Informasi resmi dari Pemerintah Gampong Blang akan tampil di sini.',
  ),
];

class _AnnouncementCarousel extends StatefulWidget {
  const _AnnouncementCarousel();

  @override
  State<_AnnouncementCarousel> createState() => _AnnouncementCarouselState();
}

class _AnnouncementCarouselState extends State<_AnnouncementCarousel> {
  late final PageController _pageController;
  int _current = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      key: const Key('home-announcement-carousel'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle('Pengumuman'),
        SizedBox(
          height: 168,
          child: PageView.builder(
            controller: _pageController,
            itemCount: _announcementPlaceholders.length,
            onPageChanged: (i) => setState(() => _current = i),
            itemBuilder: (_, i) =>
                _AnnouncementCard(slide: _announcementPlaceholders[i]),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            _announcementPlaceholders.length,
            (i) => _Dot(active: i == _current),
          ),
        ),
      ],
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  const _AnnouncementCard({required this.slide});

  final _AnnouncementSlide slide;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('home-announcement-card'),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.gold500,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppTheme.g900,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              slide.badge,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            slide.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppTheme.ink900,
              fontSize: 18,
              fontWeight: FontWeight.w800,
              height: 1.15,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            slide.body,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppTheme.ink700,
              fontSize: 12,
              height: 1.25,
            ),
          ),
        ],
      ),
    );
  }
}

class _PrimaryActionCard extends StatelessWidget {
  const _PrimaryActionCard({
    super.key,
    required this.subtitle,
    required this.onTap,
  });

  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppTheme.gold500,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              const _PrimaryIcon(),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      StringsId.letterRequest,
                      style: TextStyle(
                        color: AppTheme.ink900,
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: AppTheme.ink700,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppTheme.ink900),
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
        color: AppTheme.g900,
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
        child: SizedBox.expand(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.gold500,
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Icon(icon, color: AppTheme.ink900, size: 22),
                ),
                const SizedBox(height: 14),
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14.5,
                    height: 1.15,
                  ),
                ),
                const SizedBox(height: 5),
                Expanded(
                  child: Text(
                    subtitle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: AppTheme.ink500,
                      height: 1.35,
                    ),
                  ),
                ),
              ],
            ),
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

(Color, Color) _homeStatusColors(String status) {
  return switch (status) {
    'SENT' || 'GENERATED' || 'APPROVED' => (AppTheme.okBg, AppTheme.ok),
    'REJECTED' || 'CANCELED' => (AppTheme.dangerBg, AppTheme.danger),
    _ => (AppTheme.warnBg, AppTheme.warn),
  };
}

(Color, Color) _homeFeedbackStatusColors(String status) {
  return switch (status) {
    'responded' => (AppTheme.okBg, AppTheme.ok),
    'read' => (AppTheme.warnBg, AppTheme.warn),
    _ => (AppTheme.g50, AppTheme.g700),
  };
}

String _homeFeedbackStatusLabel(String status) {
  return switch (status) {
    'responded' => 'Dibalas',
    'read' => 'Dibaca',
    _ => 'Baru',
  };
}

String _homeDate(DateTime value) {
  return '${value.day.toString().padLeft(2, '0')}/${value.month.toString().padLeft(2, '0')}/${value.year}';
}

class _StatusPill extends StatelessWidget {
  const _StatusPill(this.text, this.bgColor, this.textColor, {super.key});

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
