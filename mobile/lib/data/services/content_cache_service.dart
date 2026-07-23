import 'dart:typed_data';

import 'package:hive_flutter/hive_flutter.dart';

import 'submission_queue_service.dart';

class ContentCacheKeys {
  const ContentCacheKeys._();

  static const banners = 'content:banners';
  static const profile = 'content:profile';
  static const visionMission = 'content:vision-mission';
  static const officials = 'content:officials';
  static const strengths = 'content:strengths';
  static const demographics = 'content:demographics';
  static const prayerConfig = 'content:prayer-config';
  static const mosques = 'content:mosques';
  static const letterTypes = 'letters:types';

  static String requestTrack(String referenceCode) =>
      'letters:track:${referenceCode.trim().toUpperCase()}';
}

class CachedJson {
  const CachedJson({required this.data, required this.updatedAt});

  final Object? data;
  final DateTime updatedAt;
}

abstract class ContentCacheService {
  static const boxName = 'content_cache';

  Future<void> putJson(String key, Object? data);

  CachedJson? getJson(String key);

  DateTime? updatedAt(String key) => getJson(key)?.updatedAt;

  Future<T> getOrFetch<T>({
    required String key,
    required Future<Object?> Function() fetch,
    required T Function(Object? data) decode,
  }) async {
    try {
      final data = await fetch();
      await putJson(key, data);
      return decode(data);
    } catch (_) {
      final cached = getJson(key);
      if (cached != null) return decode(cached.data);
      rethrow;
    }
  }
}

class HiveContentCacheService extends ContentCacheService {
  HiveContentCacheService(this._box);

  final Box<Object?> _box;

  static Future<void> init() async {
    await Hive.initFlutter();
    if (!Hive.isBoxOpen(ContentCacheService.boxName)) {
      await Hive.openBox<Object?>(ContentCacheService.boxName);
    }
    if (!Hive.isBoxOpen(ApiFileCacheService.boxName)) {
      await Hive.openBox<Object?>(ApiFileCacheService.boxName);
    }
    await HiveSubmissionQueueService.init();
  }

  static ContentCacheService openedOrMemory() {
    if (!Hive.isBoxOpen(ContentCacheService.boxName)) {
      return MemoryContentCacheService();
    }
    return HiveContentCacheService(
      Hive.box<Object?>(ContentCacheService.boxName),
    );
  }

  @override
  CachedJson? getJson(String key) {
    final entry = _box.get(key);
    if (entry is! Map) return null;

    final updatedAtRaw = entry['updated_at'];
    final updatedAt = updatedAtRaw is String
        ? DateTime.tryParse(updatedAtRaw)
        : null;
    if (updatedAt == null) return null;

    return CachedJson(
      data: _normalizeJson(entry['data']),
      updatedAt: updatedAt,
    );
  }

  @override
  Future<void> putJson(String key, Object? data) {
    return _box.put(key, {
      'data': _normalizeJson(data),
      'updated_at': DateTime.now().toIso8601String(),
    });
  }
}

class CachedBytes {
  const CachedBytes({required this.bytes, required this.updatedAt});

  final Uint8List bytes;
  final DateTime updatedAt;
}

String apiFileCacheKey({String? fileId, String? url}) {
  final explicitId = fileId?.trim();
  if (explicitId != null && explicitId.isNotEmpty) {
    return 'api-file:$explicitId';
  }

  final parsedUrl = url == null || url.isEmpty ? null : Uri.tryParse(url);
  final segments = parsedUrl?.pathSegments ?? const <String>[];
  final uploadsIndex = segments.indexOf('uploads');
  if (uploadsIndex >= 0 && uploadsIndex + 1 < segments.length) {
    return 'api-file:${segments[uploadsIndex + 1]}';
  }

  return 'api-file:${url ?? ''}';
}

abstract class ApiFileCacheService {
  static const boxName = 'api_file_cache';

  Future<void> putBytes(String key, Uint8List bytes);

  CachedBytes? getBytes(String key);
}

class HiveApiFileCacheService extends ApiFileCacheService {
  HiveApiFileCacheService(this._box);

  final Box<Object?> _box;

  static ApiFileCacheService openedOrMemory() {
    if (!Hive.isBoxOpen(ApiFileCacheService.boxName)) {
      return MemoryApiFileCacheService();
    }
    return HiveApiFileCacheService(
      Hive.box<Object?>(ApiFileCacheService.boxName),
    );
  }

  @override
  CachedBytes? getBytes(String key) {
    final entry = _box.get(key);
    if (entry is! Map) return null;

    final updatedAtRaw = entry['updated_at'];
    final updatedAt = updatedAtRaw is String
        ? DateTime.tryParse(updatedAtRaw)
        : null;
    if (updatedAt == null) return null;

    final bytesRaw = entry['bytes'];
    final bytes = switch (bytesRaw) {
      Uint8List value => value,
      List value => Uint8List.fromList(value.cast<int>()),
      _ => null,
    };
    if (bytes == null || bytes.isEmpty) return null;

    return CachedBytes(bytes: bytes, updatedAt: updatedAt);
  }

  @override
  Future<void> putBytes(String key, Uint8List bytes) {
    return _box.put(key, {
      'bytes': bytes,
      'updated_at': DateTime.now().toIso8601String(),
    });
  }
}

class MemoryApiFileCacheService extends ApiFileCacheService {
  final _store = <String, CachedBytes>{};

  @override
  CachedBytes? getBytes(String key) => _store[key];

  @override
  Future<void> putBytes(String key, Uint8List bytes) async {
    _store[key] = CachedBytes(bytes: bytes, updatedAt: DateTime.now());
  }
}

class MemoryContentCacheService extends ContentCacheService {
  final _store = <String, CachedJson>{};

  @override
  CachedJson? getJson(String key) => _store[key];

  @override
  Future<void> putJson(String key, Object? data) async {
    _store[key] = CachedJson(
      data: _normalizeJson(data),
      updatedAt: DateTime.now(),
    );
  }
}

Object? _normalizeJson(Object? value) {
  if (value is Map) {
    return {
      for (final entry in value.entries)
        entry.key.toString(): _normalizeJson(entry.value),
    };
  }
  if (value is List) {
    return [for (final item in value) _normalizeJson(item)];
  }
  return value;
}
