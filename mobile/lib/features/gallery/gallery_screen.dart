import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/cached_api_image.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/gallery_item.dart';
import '../../data/providers/content_providers.dart';

class GalleryScreen extends ConsumerWidget {
  const GalleryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final galleryAsync = ref.watch(galleryProvider);

    return SapaScaffold(
      title: 'Galeri',
      subtitle: 'Foto dan video kegiatan gampong',
      selectedIndex: 1,
      leading: const SapaBackButton(),
      body: galleryAsync.when(
        loading: () => const _GalleryLoading(),
        error: (err, stack) => _GalleryMessage(
          icon: Icons.wifi_off_outlined,
          title: 'Galeri belum bisa dimuat',
          body: 'Coba lagi saat koneksi tersedia.',
          action: OutlinedButton.icon(
            onPressed: () => ref.invalidate(galleryProvider),
            icon: const Icon(Icons.refresh),
            label: const Text('Muat ulang'),
          ),
        ),
        data: (items) {
          final active = items.where((item) => item.active).toList();
          if (active.isEmpty) {
            return const _GalleryMessage(
              icon: Icons.photo_library_outlined,
              title: 'Belum ada media',
              body:
                  'Foto dan video kegiatan Gampong Blang akan tampil di sini.',
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(galleryProvider.future),
            child: GridView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.78,
              ),
              itemCount: active.length,
              itemBuilder: (context, index) =>
                  _GalleryCard(item: active[index]),
            ),
          );
        },
      ),
    );
  }
}

class _GalleryCard extends StatelessWidget {
  const _GalleryCard({required this.item});

  final GalleryItem item;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _showGalleryDetail(context, item),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (item.isVideo)
                    const ColoredBox(
                      color: AppTheme.ink900,
                      child: Center(
                        child: Icon(
                          Icons.play_circle_fill,
                          color: AppTheme.gold500,
                          size: 46,
                        ),
                      ),
                    )
                  else if (item.mediaUrl?.isNotEmpty == true)
                    CachedApiImage(
                      url: item.mediaUrl,
                      cacheKey: item.fileId,
                      fit: BoxFit.cover,
                      fallback: const _GalleryImageFallback(),
                    )
                  else
                    const _GalleryImageFallback(),
                  Positioned(
                    left: 8,
                    top: 8,
                    child: _MediaChip(isVideo: item.isVideo),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.caption?.isNotEmpty == true
                        ? item.caption!
                        : (item.isVideo ? 'Video kegiatan' : 'Foto kegiatan'),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppTheme.ink500,
                      fontSize: 11.5,
                      height: 1.35,
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

class _MediaChip extends StatelessWidget {
  const _MediaChip({required this.isVideo});

  final bool isVideo;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppTheme.g900.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isVideo ? Icons.play_arrow : Icons.image_outlined,
              color: Colors.white,
              size: 13,
            ),
            const SizedBox(width: 4),
            Text(
              isVideo ? 'Video' : 'Foto',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GalleryImageFallback extends StatelessWidget {
  const _GalleryImageFallback();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: AppTheme.g100,
      child: Center(
        child: Icon(Icons.image_outlined, color: AppTheme.g700, size: 34),
      ),
    );
  }
}

class _GalleryLoading extends StatelessWidget {
  const _GalleryLoading();

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      itemCount: 6,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.78,
      ),
      itemBuilder: (context, index) => const Card(
        margin: EdgeInsets.zero,
        child: Center(
          child: SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      ),
    );
  }
}

class _GalleryMessage extends StatelessWidget {
  const _GalleryMessage({
    required this.icon,
    required this.title,
    required this.body,
    this.action,
  });

  final IconData icon;
  final String title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 32),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              children: [
                Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    color: AppTheme.gold500,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Icon(icon, size: 34, color: AppTheme.ink900),
                ),
                const SizedBox(height: 20),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  body,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppTheme.ink700, height: 1.55),
                ),
                if (action != null) ...[const SizedBox(height: 18), action!],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

void _showGalleryDetail(BuildContext context, GalleryItem item) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppTheme.cardGold,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
    ),
    builder: (context) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Align(
                alignment: Alignment.center,
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.ink300,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: _GalleryDetailMedia(item: item),
              ),
              const SizedBox(height: 14),
              Text(
                item.title,
                style: const TextStyle(
                  color: AppTheme.ink900,
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  height: 1.2,
                ),
              ),
              if (item.caption?.isNotEmpty == true) ...[
                const SizedBox(height: 8),
                Text(
                  item.caption!,
                  style: const TextStyle(color: AppTheme.ink700, height: 1.55),
                ),
              ],
              if (item.isVideo && item.mediaUrl?.isNotEmpty == true) ...[
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () => _openVideo(context, item.mediaUrl!),
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Putar video'),
                ),
              ],
            ],
          ),
        ),
      );
    },
  );
}

class _GalleryDetailMedia extends StatelessWidget {
  const _GalleryDetailMedia({required this.item});

  final GalleryItem item;

  @override
  Widget build(BuildContext context) {
    if (item.isVideo) {
      return const AspectRatio(
        aspectRatio: 16 / 10,
        child: ColoredBox(
          color: AppTheme.ink900,
          child: Center(
            child: Icon(
              Icons.play_circle_fill,
              color: AppTheme.gold500,
              size: 62,
            ),
          ),
        ),
      );
    }

    if (item.mediaUrl?.isNotEmpty != true) {
      return const _GalleryImageFallback();
    }

    return ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.68,
      ),
      child: CachedApiImage(
        url: item.mediaUrl,
        cacheKey: item.fileId,
        fit: BoxFit.contain,
        fallback: const _GalleryImageFallback(),
      ),
    );
  }
}

Future<void> _openVideo(BuildContext context, String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return;

  final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!opened && context.mounted) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Video belum bisa dibuka.')));
  }
}
