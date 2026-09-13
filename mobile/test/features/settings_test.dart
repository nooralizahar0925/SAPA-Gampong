import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/data/models/prayer_config.dart';
import 'package:sapa_gampong/data/providers/app_preferences_providers.dart';
import 'package:sapa_gampong/data/providers/content_providers.dart';
import 'package:sapa_gampong/data/services/app_preferences_service.dart';
import 'package:sapa_gampong/data/services/notification_service.dart';
import 'package:sapa_gampong/data/services/prayer_times_service.dart';
import 'package:sapa_gampong/features/settings/settings_screen.dart';

class _FakeNotificationService extends NotificationService {
  int scheduleCalls = 0;
  int cancelCalls = 0;
  int syncPreferenceCalls = 0;
  AppPreferences? lastSyncedPreferences;

  @override
  Future<void> scheduleDaily({
    required PrayerTimes prayerTimes,
    required String adzanUrl,
    DateTime? now,
  }) async {
    scheduleCalls += 1;
  }

  @override
  Future<void> cancel() async {
    cancelCalls += 1;
  }

  @override
  Future<void> syncDevicePreferences(AppPreferences preferences) async {
    syncPreferenceCalls += 1;
    lastSyncedPreferences = preferences;
  }
}

class _FakePrayerTimesService extends PrayerTimesService {
  @override
  Future<PrayerTimes> fetchUsingAvailableGpsForConfig(
    PrayerConfig config, {
    DateTime? date,
  }) async {
    return PrayerTimes(
      subuh: '04:50',
      dhuhur: '12:20',
      ashar: '15:40',
      maghrib: '18:25',
      isya: '19:40',
      sourceLabel: 'Internet · GPS Anda',
      fetchedAt: DateTime.now(),
      latitude: 5.0,
      longitude: 96.0,
    );
  }
}

Widget _wrap({
  required AppPreferencesService preferences,
  required NotificationService notifications,
  PrayerConfig prayerConfig = const PrayerConfig(
    adzanFileId: 'audio-1',
    adzanUrl: 'https://example.test/audio.mp3',
  ),
}) {
  return ProviderScope(
    overrides: [
      appPreferencesServiceProvider.overrideWithValue(preferences),
      notificationServiceProvider.overrideWithValue(notifications),
      prayerConfigProvider.overrideWith((_) async => prayerConfig),
      prayerTimesServiceProvider.overrideWith((_) => _FakePrayerTimesService()),
    ],
    child: const MaterialApp(home: SettingsScreen()),
  );
}

void main() {
  testWidgets('shows privacy and data deletion entry', (tester) async {
    final preferences = AppPreferencesService.memory();
    final notifications = _FakeNotificationService();

    await tester.pumpWidget(
      _wrap(preferences: preferences, notifications: notifications),
    );
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('Privasi & Penghapusan Data'),
      300,
      scrollable: find.byType(Scrollable).first,
    );

    expect(find.text('Privasi & Penghapusan Data'), findsOneWidget);
    expect(
      find.text('Baca kebijakan atau ajukan penghapusan data'),
      findsOneWidget,
    );
  });

  testWidgets('alarm azan switch persists enabled preference and schedules', (
    tester,
  ) async {
    final preferences = AppPreferencesService.memory();
    final notifications = _FakeNotificationService();

    await tester.pumpWidget(
      _wrap(preferences: preferences, notifications: notifications),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Alarm Azan'));
    await tester.pumpAndSettle();

    expect(preferences.read().adzanAlarmEnabled, true);
    expect(notifications.scheduleCalls, 1);
    expect(find.text('Alarm azan aktif.'), findsOneWidget);
  });

  testWidgets('alarm azan switch persists disabled preference and cancels', (
    tester,
  ) async {
    final preferences = AppPreferencesService.memory(
      initial: const AppPreferences(adzanAlarmEnabled: true),
    );
    final notifications = _FakeNotificationService();

    await tester.pumpWidget(
      _wrap(preferences: preferences, notifications: notifications),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Alarm Azan'));
    await tester.pumpAndSettle();

    expect(preferences.read().adzanAlarmEnabled, false);
    expect(notifications.cancelCalls, 1);
  });

  testWidgets('letter status switch persists and syncs device preference', (
    tester,
  ) async {
    final preferences = AppPreferencesService.memory();
    final notifications = _FakeNotificationService();

    await tester.pumpWidget(
      _wrap(preferences: preferences, notifications: notifications),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Status Permohonan Surat'));
    await tester.pumpAndSettle();

    expect(preferences.read().letterStatusNotifications, false);
    expect(notifications.syncPreferenceCalls, 1);
    expect(
      notifications.lastSyncedPreferences?.letterStatusNotifications,
      false,
    );
  });

  testWidgets('feedback status switch persists and syncs device preference', (
    tester,
  ) async {
    final preferences = AppPreferencesService.memory();
    final notifications = _FakeNotificationService();

    await tester.pumpWidget(
      _wrap(preferences: preferences, notifications: notifications),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Status Laporan Warga'));
    await tester.pumpAndSettle();

    expect(preferences.read().feedbackStatusNotifications, false);
    expect(notifications.syncPreferenceCalls, 1);
    expect(
      notifications.lastSyncedPreferences?.feedbackStatusNotifications,
      false,
    );
  });
}
