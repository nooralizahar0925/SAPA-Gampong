import 'package:flutter_riverpod/flutter_riverpod.dart';

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
import '../repositories/content_repository.dart';
import '../services/notification_service.dart';
import '../services/prayer_times_service.dart';
import 'cache_providers.dart';
import 'letter_providers.dart';

final contentRepositoryProvider = Provider<ContentRepository>((ref) {
  return ContentRepository(
    ref.watch(dioClientProvider),
    cache: ref.watch(contentCacheServiceProvider),
  );
});

final bannersProvider = FutureProvider<List<BannerSlide>>((ref) {
  return ref.watch(contentRepositoryProvider).banners();
});

final galleryProvider = FutureProvider<List<GalleryItem>>((ref) {
  return ref.watch(contentRepositoryProvider).gallery();
});

final socialLinksProvider = FutureProvider<List<SocialMediaLink>>((ref) {
  return ref.watch(contentRepositoryProvider).socialLinks();
});

final villageProfileProvider = FutureProvider<VillageProfile>((ref) {
  return ref.watch(contentRepositoryProvider).profile();
});

final visionMissionProvider = FutureProvider<VisionMission>((ref) {
  return ref.watch(contentRepositoryProvider).visionMission();
});

final officialsProvider = FutureProvider<List<Official>>((ref) {
  return ref.watch(contentRepositoryProvider).officials();
});

final strengthsProvider = FutureProvider<List<VillageStrength>>((ref) {
  return ref.watch(contentRepositoryProvider).strengths();
});

final demographicsProvider = FutureProvider<List<DemographicBlock>>((ref) {
  return ref.watch(contentRepositoryProvider).demographics();
});

final prayerConfigProvider = FutureProvider<PrayerConfig>((ref) {
  return ref.watch(contentRepositoryProvider).prayerConfig();
});

final mosquesProvider = FutureProvider<List<Mosque>>((ref) {
  return ref.watch(contentRepositoryProvider).mosques();
});

// Injectable service — override in tests to skip network/GPS.
final prayerTimesServiceProvider = Provider<PrayerTimesService>((ref) {
  return PrayerTimesService(cache: ref.watch(contentCacheServiceProvider));
});

final notificationServiceProvider = Provider<NotificationService>((ref) {
  final service = NotificationService(
    client: ref.watch(dioClientProvider),
    fileCache: ref.watch(apiFileCacheServiceProvider),
  );
  ref.onDispose(service.dispose);
  return service;
});
