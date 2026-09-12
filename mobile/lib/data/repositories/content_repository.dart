import '../models/banner_slide.dart';
import '../models/demographic_block.dart';
import '../models/gallery_item.dart';
import '../models/mosque.dart';
import '../models/official.dart';
import '../models/prayer_config.dart';
import '../models/social_media_link.dart';
import '../models/village_profile.dart';
import '../models/village_strength.dart';
import '../models/vision_mission.dart';
import '../services/content_cache_service.dart';
import '../../core/network/dio_client.dart';

class ContentRepository {
  ContentRepository(this._client, {this.cache});

  final DioClient _client;
  final ContentCacheService? cache;

  Future<List<BannerSlide>> banners() async {
    return _cached(
      key: ContentCacheKeys.banners,
      fetch: () async {
        final res = await _client.dio.get<List<dynamic>>('/content/banners');
        return res.data ?? [];
      },
      decode: (data) => _objectMaps(data).map(BannerSlide.fromJson).toList(),
    );
  }

  Future<VillageProfile> profile() async {
    return _cached(
      key: ContentCacheKeys.profile,
      fetch: () async {
        final res = await _client.dio.get<Map<String, Object?>>(
          '/content/profile',
        );
        return res.data ?? {};
      },
      decode: (data) => VillageProfile.fromJson(_objectMap(data)),
    );
  }

  Future<List<GalleryItem>> gallery() async {
    return _cached(
      key: ContentCacheKeys.gallery,
      fetch: () async {
        final res = await _client.dio.get<List<dynamic>>('/content/gallery');
        return res.data ?? [];
      },
      decode: (data) => _objectMaps(data).map(GalleryItem.fromJson).toList(),
    );
  }

  Future<List<SocialMediaLink>> socialLinks() async {
    return _cached(
      key: ContentCacheKeys.socialLinks,
      fetch: () async {
        final res = await _client.dio.get<List<dynamic>>(
          '/content/social-links',
        );
        return res.data ?? [];
      },
      decode: (data) =>
          _objectMaps(data).map(SocialMediaLink.fromJson).toList(),
    );
  }

  Future<VisionMission> visionMission() async {
    return _cached(
      key: ContentCacheKeys.visionMission,
      fetch: () async {
        final res = await _client.dio.get<Map<String, Object?>>(
          '/content/vision-mission',
        );
        return res.data ?? {};
      },
      decode: (data) => VisionMission.fromJson(_objectMap(data)),
    );
  }

  Future<List<Official>> officials() async {
    return _cached(
      key: ContentCacheKeys.officials,
      fetch: () async {
        final res = await _client.dio.get<List<dynamic>>('/content/officials');
        return res.data ?? [];
      },
      decode: (data) => _objectMaps(data).map(Official.fromJson).toList(),
    );
  }

  Future<List<VillageStrength>> strengths() async {
    return _cached(
      key: ContentCacheKeys.strengths,
      fetch: () async {
        final res = await _client.dio.get<List<dynamic>>('/content/strengths');
        return res.data ?? [];
      },
      decode: (data) =>
          _objectMaps(data).map(VillageStrength.fromJson).toList(),
    );
  }

  Future<List<DemographicBlock>> demographics() async {
    return _cached(
      key: ContentCacheKeys.demographics,
      fetch: () async {
        final res = await _client.dio.get<List<dynamic>>(
          '/content/demographics',
        );
        return res.data ?? [];
      },
      decode: (data) =>
          _objectMaps(data).map(DemographicBlock.fromJson).toList(),
    );
  }

  Future<List<Mosque>> mosques() async {
    return _cached(
      key: ContentCacheKeys.mosques,
      fetch: () async {
        final res = await _client.dio.get<List<dynamic>>('/content/mosques');
        return res.data ?? [];
      },
      decode: (data) => _objectMaps(data).map(Mosque.fromJson).toList(),
    );
  }

  Future<PrayerConfig> prayerConfig() async {
    return _cached(
      key: ContentCacheKeys.prayerConfig,
      fetch: () async {
        final res = await _client.dio.get<Map<String, Object?>>(
          '/content/prayer-config',
        );
        return res.data ?? {};
      },
      decode: (data) => PrayerConfig.fromJson(_objectMap(data)),
    );
  }

  Future<T> _cached<T>({
    required String key,
    required Future<Object?> Function() fetch,
    required T Function(Object? data) decode,
  }) {
    final currentCache = cache;
    if (currentCache == null) return fetch().then(decode);
    return currentCache.getOrFetch(key: key, fetch: fetch, decode: decode);
  }
}

Map<String, Object?> _objectMap(Object? value) {
  if (value is Map<String, Object?>) return value;
  if (value is Map) return Map<String, Object?>.from(value);
  return {};
}

List<Map<String, Object?>> _objectMaps(Object? value) {
  if (value is! List) return [];
  return value.whereType<Map>().map(Map<String, Object?>.from).toList();
}
