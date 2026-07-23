import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/data/models/mosque.dart';
import 'package:sapa_gampong/data/models/prayer_config.dart';
import 'package:sapa_gampong/data/providers/content_providers.dart';
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

  testWidgets('shows config fallback times when no coordinates configured', (
    tester,
  ) async {
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

    // Config fallback times shown.
    expect(find.text('05:02 WIB'), findsOneWidget);
    expect(find.text('12:32 WIB'), findsOneWidget);

    // Source label matches config fallback (no internet fetch happened).
    expect(find.text('Data Gampong Blang'), findsOneWidget);
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

    expect(
      find.text('Aktifkan untuk menjadwalkan audio azan.'),
      findsOneWidget,
    );
    expect(find.text('Audio belum dikonfigurasi admin'), findsNothing);
  });

  testWidgets('alarm toggle schedules adzan notification service', (
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
          notificationServiceProvider.overrideWithValue(notifications),
        ],
      ),
    );

    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('prayer-adzan-toggle')));
    await tester.pump();

    expect(notifications.scheduleCalls, 1);
    expect(
      notifications.scheduledAdzanUrl,
      'http://localhost:8080/api/uploads/audio-1',
    );
    expect(
      find.text('Audio azan akan diputar saat waktu sholat berikutnya.'),
      findsOneWidget,
    );
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

  testWidgets(
    'auto-fetches via village coords and shows updated source label',
    (tester) async {
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
              (_) => _FakePrayerTimesService(),
            ),
          ],
        ),
      );

      await tester.pumpAndSettle();

      // The fake service returned "Internet · Koordinat Desa" label.
      expect(find.text('Internet · Koordinat Desa'), findsOneWidget);
      // The fake service returned village times.
      expect(find.text('04:45 WIB'), findsOneWidget);
    },
  );

  testWidgets('falls back to config times when village fetch fails', (
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

  testWidgets('GPS button triggers fetchUsingGps and shows updated times', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    // Config with no coordinates → auto-fetch skipped; then user taps GPS.
    await tester.pumpWidget(
      _wrap(
        const PrayerScreen(),
        overrides: [
          prayerConfigProvider.overrideWith((_) async => const PrayerConfig()),
          prayerTimesServiceProvider.overrideWith(
            (_) => _FakePrayerTimesService(),
          ),
        ],
      ),
    );

    await tester.pumpAndSettle();

    // Tap GPS button.
    await tester.tap(find.byKey(const Key('prayer-use-gps')));
    await tester.pumpAndSettle();

    // Fake GPS service returned these times.
    expect(find.text('04:50 WIB'), findsOneWidget);
    expect(find.text('Internet · GPS Anda'), findsOneWidget);
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
