import 'dart:async';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/localization/strings_id.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/mock/village_seed.dart';
import '../../data/models/banner_slide.dart';
import '../../data/providers/content_providers.dart';
import '../../data/providers/cache_providers.dart';
import '../../data/services/content_cache_service.dart';
import '../../data/providers/letter_providers.dart';
import '../../data/providers/resident_providers.dart';
import '../services/services_screen.dart';

// Shared by the carousel, each image, and the loading/error fallback.
const _homeBannerHeight = 220.0;

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
                key: const Key('home-gallery'),
                icon: Icons.photo_library_outlined,
                title: 'Galeri',
                subtitle: 'Foto & video kegiatan',
                onTap: () => context.pushNamed(AppRouteNames.gallery),
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
          height: _homeBannerHeight,
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

class _BannerCarousel extends ConsumerStatefulWidget {
  const _BannerCarousel({required this.slides});

  final List<BannerSlide> slides;

  @override
  ConsumerState<_BannerCarousel> createState() => _BannerCarouselState();
}

class _BannerCarouselState extends ConsumerState<_BannerCarousel> {
  late final PageController _pageController;
  int _current = 0;
  Timer? _timer;
  bool _dragging = false;
  int _generation = 0;
  final Map<int, Uint8List> _images = {};
  final Map<int, Future<void>> _loads = {};
  final Set<int> _settled = {};
  final Set<int> _failed = {};

  String _signature(List<BannerSlide> slides) =>
      slides.map((s) => '${s.id}:${s.imageFileId}:${s.imageUrl}').join('|');

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    unawaited(_prepare());
  }

  @override
  void didUpdateWidget(_BannerCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_signature(oldWidget.slides) == _signature(widget.slides)) return;
    _generation++;
    _timer?.cancel();
    _current = 0;
    _images.clear();
    _loads.clear();
    _settled.clear();
    _failed.clear();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_pageController.hasClients) _pageController.jumpToPage(0);
      unawaited(_prepare());
    });
  }

  int? _nextIndex() {
    for (var offset = 1; offset < widget.slides.length; offset++) {
      final next = (_current + offset) % widget.slides.length;
      if (!_failed.contains(next)) return next;
    }
    return null;
  }

  Future<void> _prepare() async {
    final generation = _generation;
    final current = _current;
    await _load(current, generation);
    if (!mounted || generation != _generation || current != _current) return;
    var next = _nextIndex();
    // Preload and decode the next image before starting its transition.
    while (next != null) {
      await _load(next, generation);
      if (!mounted || generation != _generation || current != _current) return;
      if (!_failed.contains(next)) break;
      next = _nextIndex();
    }
    if (next == null || _dragging) return;
    _timer?.cancel();
    _timer = Timer(const Duration(seconds: 5), () {
      if (!mounted ||
          generation != _generation ||
          current != _current ||
          _dragging ||
          !_pageController.hasClients) {
        return;
      }
      unawaited(
        _pageController.animateToPage(
          next!,
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeInOut,
        ),
      );
    });
  }

  Future<void> _load(int index, int generation) {
    if (_settled.contains(index)) return Future.value();
    return _loads.putIfAbsent(index, () => _loadImage(index, generation));
  }

  Future<void> _loadImage(int index, int generation) async {
    final slide = widget.slides[index];
    final url = slide.imageUrl;
    if (url == null || url.isEmpty) {
      _settled.add(index);
      return;
    }
    try {
      final bytes = await ref
          .read(apiFileCacheServiceProvider)
          .getOrFetchBytes(
            key: apiFileCacheKey(fileId: slide.imageFileId, url: url),
            fetch: () async {
              final response = await ref
                  .read(dioClientProvider)
                  .dio
                  .get<List<int>>(
                    url,
                    options: Options(responseType: ResponseType.bytes),
                  );
              return Uint8List.fromList(response.data ?? []);
            },
          );
      if (!mounted || generation != _generation) return;
      Object? decodeError;
      await precacheImage(
        MemoryImage(bytes),
        context,
        onError: (error, _) => decodeError = error,
      );
      if (decodeError != null) throw decodeError!;
      if (!mounted || generation != _generation) return;
      setState(() => _images[index] = bytes);
    } catch (_) {
      if (!mounted || generation != _generation) return;
      setState(() => _failed.add(index));
    }
    if (mounted && generation == _generation) _settled.add(index);
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
          height: _homeBannerHeight,
          child: NotificationListener<ScrollNotification>(
            onNotification: (notification) {
              if (notification is ScrollStartNotification &&
                  notification.dragDetails != null) {
                _dragging = true;
                _timer?.cancel();
              } else if (notification is ScrollEndNotification) {
                _dragging = false;
                unawaited(_prepare());
              }
              return false;
            },
            child: PageView.builder(
              controller: _pageController,
              itemCount: widget.slides.length,
              onPageChanged: (i) {
                _timer?.cancel();
                setState(() => _current = i);
                unawaited(_prepare());
              },
              itemBuilder: (_, i) => _BannerCard(
                slide: widget.slides[i],
                bytes: _images[i],
                loading: !_settled.contains(i),
              ),
            ),
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
  const _BannerCard({required this.slide, this.bytes, required this.loading});

  final BannerSlide slide;
  final Uint8List? bytes;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: _homeBannerHeight,
        width: double.infinity,
        child: bytes != null
            ? Image.memory(
                bytes!,
                height: _homeBannerHeight,
                width: double.infinity,
                fit: BoxFit.cover,
                gaplessPlayback: true,
                errorBuilder: (_, _, _) => _gradientBox(),
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
    child: loading ? const Center(child: CircularProgressIndicator()) : null,
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
