import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'data/services/app_preferences_service.dart';
import 'data/services/content_cache_service.dart';
import 'data/services/notification_service.dart';
import 'data/services/resident_session_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  NotificationService.registerBackgroundHandler();
  await HiveContentCacheService.init();
  await AppPreferencesService.init();
  await ResidentSessionService.init();
  runApp(const ProviderScope(child: App()));
}
