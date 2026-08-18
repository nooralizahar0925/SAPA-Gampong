import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/data/models/mosque.dart';
import 'package:sapa_gampong/data/models/prayer_config.dart';
import 'package:sapa_gampong/data/providers/app_preferences_providers.dart';
import 'package:sapa_gampong/data/providers/content_providers.dart';
import 'package:sapa_gampong/data/services/app_preferences_service.dart';
import 'package:sapa_gampong/data/services/notification_service.dart';
import 'package:sapa_gampong/data/services/prayer_times_service.dart';
import 'package:sapa_gampong/features/prayer/prayer_screen.dart';

// ── Fake service ──────────────────────────────────────────────────────────────

class _FakePrayerTimesService extends PrayerTimesService {
  _FakePrayerTimesService({this.villageError, this.gpsError})
    : super(
        locationProvider: () async =>
            const PrayerLocation(latitude: 5.0, longitude: 96.0),
      );

  final Object? villageError;
  final Object? gpsError;
  int passiveGpsCalls = 0;
  int requestedGpsCalls = 0;

  @override
  Future<PrayerTimes> fetchForVillageConfig(
    PrayerConfig config, {
    DateTime? date,
  }) async {
    if (villageError != null) throw villageError!;
    return PrayerTimes(
      subuh: '04:45',
      dhuhur: '12:15',
      ashar: '15:30',
      maghrib: '18:20',
      isya: '19:35',
      sourceLabel: 'Internet · Koordinat Desa',
      fetchedAt: DateTime.now(),
    );
  }

  @override
  Future<PrayerTimes> fetchUsingGpsForConfig(
    PrayerConfig config, {
    DateTime? date,
  }) async {
    requestedGpsCalls += 1;
    return fetchUsingGps(date: date);
  }

  @override
  Future<PrayerTimes> fetchUsingAvailableGpsForConfig(
    PrayerConfig config, {
    DateTime? date,
  }) async {
    passiveGpsCalls += 1;
    return fetchUsingGps(date: date);
  }

  @override
  Future<PrayerTimes> fetchUsingGps({DateTime? date}) async {
    if (gpsError != null) throw gpsError!;
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

class _FakeNotificationService extends NotificationService {
  int scheduleCalls = 0;
  int cancelCalls = 0;
  PrayerTimes? scheduledTimes;
  String? scheduledAdzanUrl;

  @override
  Future<void> scheduleDaily({
    required PrayerTimes prayerTimes,
    required String adzanUrl,
    DateTime? now,
  }) async {
    scheduleCalls += 1;
    scheduledTimes = prayerTimes;
    scheduledAdzanUrl = adzanUrl;
  }

  @override
  Future<void> cancel() async {
    cancelCalls += 1;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

Widget _wrap(
  Widget child, {
  List<dynamic> overrides = const [],
  bool includeDefaultMosques = true,
}) {
  return ProviderScope(
    overrides: [
      if (includeDefaultMosques)
        mosquesProvider.overrideWith((_) async => const <Mosque>[]),
      ...overrides.cast(),
    ],
    child: MaterialApp(home: child),
  );
}

void main() {
  testWidgets('shows hard-coded fallback while config is loading', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final completer = Completer<PrayerConfig>();

    await tester.pumpWidget(
      _wrap(
        const PrayerScreen(),
        overrides: [
          prayerConfigProvider.overrideWith((_) => completer.future),
          prayerTimesServiceProvider.overrideWith(
            (_) => _FakePrayerTimesService(),
          ),
        ],
      ),
    );

    // First frame — config not yet resolved, hard-coded fallback visible.
    await tester.pump();

    // Hard-coded fallback times are displayed.
    expect(find.text('04:58 WIB'), findsOneWidget);
    expect(find.text('Subuh'), findsOneWidget);

    // Source label shows the hard-coded fallback label.
    expect(find.text('Data contoh Gampong Blang'), findsOneWidget);

    // Complete to clean up.
    completer.complete(const PrayerConfig());
    await tester.pumpAndSettle();
  });

  testWidgets('uses GPS times when location is available', (tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    const config = PrayerConfig(
      fallbackTimes: PrayerFallbackTimes(
        subuh: '05:02',
        dhuhur: '12:32',
        ashar: '15:55',
        maghrib: '18:40',
        isya: '19:52',
      ),
    );

    await tester.pumpWidget(
      _wrap(
        const PrayerScreen(),
        overrides: [
          prayerConfigProvider.overrideWith((_) async => config),
          prayerTimesServiceProvider.overrideWith(
            (_) => _FakePrayerTimesService(),
          ),
        ],
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('04:50 WIB'), findsOneWidget);
    expect(find.text('12:20 WIB'), findsOneWidget);
    expect(find.text('Internet · GPS Anda'), findsOneWidget);
  });

  testWidgets('shows adzan audio as configured when config includes a URL', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    const config = PrayerConfig(
      adzanFileId: 'audio-1',
      adzanUrl: 'http://localhost:8080/api/uploads/audio-1',
    );

    await tester.pumpWidget(
      _wrap(
        const PrayerScreen(),
        overrides: [
          prayerConfigProvider.overrideWith((_) async => config),
          prayerTimesServiceProvider.overrideWith(
            (_) => _FakePrayerTimesService(),
          ),
        ],
      ),
    );

    await tester.pumpAndSettle();

    expect(find.byKey(const Key('prayer-adzan-status')), findsOneWidget);
    expect(find.text('Alarm Suara Azan Nonaktif'), findsOneWidget);
    expect(find.text('Audio belum dikonfigurasi admin'), findsNothing);
  });

  testWidgets('schedules adzan from persisted settings preference', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final notifications = _FakeNotificationService();
    const config = PrayerConfig(
      adzanFileId: 'audio-1',
      adzanUrl: 'http://localhost:8080/api/uploads/audio-1',
    );

    await tester.pumpWidget(
      _wrap(
        const PrayerScreen(),
        overrides: [
          prayerConfigProvider.overrideWith((_) async => config),
          prayerTimesServiceProvider.overrideWith(
            (_) => _FakePrayerTimesService(),
          ),
          appPreferencesServiceProvider.overrideWithValue(
            AppPreferencesService.memory(
              initial: const AppPreferences(adzanAlarmEnabled: true),
            ),
          ),
          notificationServiceProvider.overrideWithValue(notifications),
        ],
      ),
    );

    await tester.pumpAndSettle();

    expect(notifications.scheduleCalls, 1);
    expect(
      notifications.scheduledAdzanUrl,
      'http://localhost:8080/api/uploads/audio-1',
    );
    expect(find.byKey(const Key('prayer-adzan-toggle')), findsNothing);
    expect(find.text('Alarm Suara Azan Aktif'), findsOneWidget);
  });

  testWidgets('shows mosque data from backend provider', (tester) async {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _wrap(
        const PrayerScreen(),
        includeDefaultMosques: false,
        overrides: [
          prayerConfigProvider.overrideWith((_) async => const PrayerConfig()),
          prayerTimesServiceProvider.overrideWith(
            (_) => _FakePrayerTimesService(),
          ),
          mosquesProvider.overrideWith(
            (_) async => const [
              Mosque(
                id: 'm1',
                name: 'Masjid Baiturrahim',
                address: 'Jl. Pesisir No. 1, Dusun Meunasah',
                landmark: 'Depan balai gampong',
              ),
            ],
          ),
        ],
      ),
    );

    await tester.pumpAndSettle();

    expect(find.byKey(const Key('prayer-mosques-list')), findsOneWidget);
    expect(find.text('Masjid Baiturrahim'), findsOneWidget);
    expect(
      find.text('Jl. Pesisir No. 1, Dusun Meunasah · Depan balai gampong'),
      findsOneWidget,
    );
  });

  testWidgets('falls back to village coords when GPS is unavailable', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    const config = PrayerConfig(
      lat: 5.1234,
      lng: 96.5678,
      fallbackTimes: PrayerFallbackTimes(subuh: '05:02', dhuhur: '12:32'),
    );

    await tester.pumpWidget(
      _wrap(
        const PrayerScreen(),
        overrides: [
          prayerConfigProvider.overrideWith((_) async => config),
          prayerTimesServiceProvider.overrideWith(
            (_) => _FakePrayerTimesService(
              gpsError: const LocationPermissionException(
                'Layanan lokasi perangkat belum aktif.',
              ),
            ),
          ),
        ],
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Internet · Koordinat Desa'), findsOneWidget);
    expect(find.text('04:45 WIB'), findsOneWidget);
  });

  testWidgets('falls back to config times when GPS and village fetch fail', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    const config = PrayerConfig(
      lat: 5.1234,
      lng: 96.5678,
      fallbackTimes: PrayerFallbackTimes(
        subuh: '05:02',
        dhuhur: '12:32',
        ashar: '15:55',
        maghrib: '18:40',
        isya: '19:52',
      ),
    );

    await tester.pumpWidget(
      _wrap(
        const PrayerScreen(),
        overrides: [
          prayerConfigProvider.overrideWith((_) async => config),
          prayerTimesServiceProvider.overrideWith(
            (_) => _FakePrayerTimesService(
              gpsError: const LocationPermissionException(
                'Layanan lokasi perangkat belum aktif.',
              ),
              villageError: Exception('Network error'),
            ),
          ),
        ],
      ),
    );

    await tester.pumpAndSettle();

    // Village fetch failed; config fallback times are still shown.
    expect(find.text('05:02 WIB'), findsOneWidget);
    // Source label stays at config fallback.
    expect(find.text('Data Gampong Blang'), findsOneWidget);
  });

  testWidgets('auto-fetches GPS and shows updated times', (tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final prayerService = _FakePrayerTimesService();

    await tester.pumpWidget(
      _wrap(
        const PrayerScreen(),
        overrides: [
          prayerConfigProvider.overrideWith((_) async => const PrayerConfig()),
          prayerTimesServiceProvider.overrideWith((_) => prayerService),
        ],
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('04:50 WIB'), findsOneWidget);
    expect(find.text('Internet · GPS Anda'), findsOneWidget);
    expect(prayerService.passiveGpsCalls, 1);
    expect(prayerService.requestedGpsCalls, 0);
  });

  testWidgets('GPS button requests permission only after an explicit tap', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final prayerService = _FakePrayerTimesService();
    await tester.pumpWidget(
      _wrap(
        const PrayerScreen(),
        overrides: [
          prayerConfigProvider.overrideWith((_) async => const PrayerConfig()),
          prayerTimesServiceProvider.overrideWith((_) => prayerService),
        ],
      ),
    );
    await tester.pumpAndSettle();

    expect(prayerService.passiveGpsCalls, 1);
    expect(prayerService.requestedGpsCalls, 0);

    await tester.tap(find.byKey(const Key('prayer-use-gps')));
    await tester.pumpAndSettle();

    expect(prayerService.requestedGpsCalls, 1);
  });

  testWidgets('GPS error shows error message and keeps previous times', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _wrap(
        const PrayerScreen(),
        overrides: [
          prayerConfigProvider.overrideWith((_) async => const PrayerConfig()),
          prayerTimesServiceProvider.overrideWith(
            (_) => _FakePrayerTimesService(
              gpsError: const LocationPermissionException(
                'Izin lokasi ditolak.',
              ),
            ),
          ),
        ],
      ),
    );

    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('prayer-use-gps')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('prayer-error-text')), findsOneWidget);
    expect(find.text('Izin lokasi ditolak.'), findsOneWidget);
  });
}
