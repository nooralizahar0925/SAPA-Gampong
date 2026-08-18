import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'data/providers/app_preferences_providers.dart';
import 'data/providers/content_providers.dart';
import 'data/providers/resident_providers.dart';
import 'data/providers/submission_queue_providers.dart';
import 'data/services/prayer_times_service.dart';

class App extends ConsumerStatefulWidget {
  const App({super.key});

  @override
  ConsumerState<App> createState() => _AppState();
}

class _AppState extends ConsumerState<App> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(submissionQueueProvider).retryPending());
    Future.microtask(_initializeNotifications);
  }

  Future<void> _initializeNotifications() async {
    final preferences = await ref.read(appPreferencesProvider.future);
    final notifications = ref.read(notificationServiceProvider);
    await notifications.initializePush(
      preferences: preferences,
      preferencesLoader: () => ref.read(appPreferencesProvider.future),
      residentSessionLoader: () => ref.read(residentSessionProvider.future),
    );

    if (!preferences.adzanAlarmEnabled ||
        await notifications.hasScheduledAdzanAlarms()) {
      return;
    }

    try {
      final config = await ref.read(prayerConfigProvider.future);
      final adzanUrl = config.adzanUrl;
      if (adzanUrl == null || adzanUrl.isEmpty) return;

      var prayerTimes = PrayerTimes.fromConfigFallback(config);
      if (config.lat != null && config.lng != null) {
        try {
          prayerTimes = await ref
              .read(prayerTimesServiceProvider)
              .fetchForVillageConfig(config);
        } catch (_) {
          // The configured fallback remains usable while offline.
        }
      }

      await notifications.scheduleDaily(
        prayerTimes: prayerTimes,
        adzanUrl: adzanUrl,
      );
    } catch (error) {
      debugPrint('Failed to restore adzan alarms: $error');
    }
  }

  @override
  Widget build(BuildContext context) {
    final router = AppRouter.router;

    return MaterialApp.router(
      title: 'Gampong Blang Digital',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
      locale: const Locale('id'),
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      supportedLocales: const [Locale('id')],
    );
  }
}
