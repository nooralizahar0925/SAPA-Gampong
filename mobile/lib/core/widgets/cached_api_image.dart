import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers/cache_providers.dart';
import '../../data/providers/letter_providers.dart';
import '../../data/services/content_cache_service.dart';

class CachedApiImage extends ConsumerStatefulWidget {
  const CachedApiImage({
    super.key,
    required this.url,
    required this.cacheKey,
    this.height,
    this.width,
    this.fit,
    this.fallback,
  });

  final String? url;
  final String? cacheKey;
  final double? height;
  final double? width;
  final BoxFit? fit;
  final Widget? fallback;

  @override
  ConsumerState<CachedApiImage> createState() => _CachedApiImageState();
}

class _CachedApiImageState extends ConsumerState<CachedApiImage> {
  Future<Uint8List>? _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void didUpdateWidget(CachedApiImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.url != widget.url || oldWidget.cacheKey != widget.cacheKey) {
      _future = _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final fallback = widget.fallback ?? const SizedBox.shrink();

    if (widget.url == null || widget.url!.isEmpty) return fallback;

    return FutureBuilder<Uint8List>(
      future: _future,
      builder: (context, snapshot) {
        final bytes = snapshot.data;
        if (bytes == null || bytes.isEmpty) return fallback;

        return Image.memory(
          bytes,
          height: widget.height,
          width: widget.width,
          fit: widget.fit,
          gaplessPlayback: true,
        );
      },
    );
  }

  Future<Uint8List> _load() async {
    final url = widget.url;
    if (url == null || url.isEmpty) throw StateError('URL gambar kosong.');

    final cache = ref.read(apiFileCacheServiceProvider);
    final key = apiFileCacheKey(fileId: widget.cacheKey, url: url);

    try {
      final res = await ref
          .read(dioClientProvider)
          .dio
          .get<List<int>>(
            url,
            options: Options(responseType: ResponseType.bytes),
          );
      final data = res.data;
      if (data == null || data.isEmpty) {
        throw StateError('Response gambar kosong.');
      }
      final bytes = Uint8List.fromList(data);
      await cache.putBytes(key, bytes);
      return bytes;
    } catch (_) {
      final cached = cache.getBytes(key);
      if (cached != null) return cached.bytes;
      rethrow;
    }
  }
}
