import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/content_cache_service.dart';

final contentCacheServiceProvider = Provider<ContentCacheService>((ref) {
  return HiveContentCacheService.openedOrMemory();
});

final apiFileCacheServiceProvider = Provider<ApiFileCacheService>((ref) {
  return HiveApiFileCacheService.openedOrMemory();
});
