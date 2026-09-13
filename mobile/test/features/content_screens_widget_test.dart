import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sapa_gampong/core/router/app_router.dart';
import 'package:sapa_gampong/data/mock/letter_seed.dart';
import 'package:sapa_gampong/data/models/demographic_block.dart';
import 'package:sapa_gampong/data/providers/content_providers.dart';
import 'package:sapa_gampong/data/providers/letter_providers.dart';
import 'package:sapa_gampong/data/providers/resident_providers.dart';
import 'package:sapa_gampong/features/demographics/demographics_screen.dart';
import 'package:sapa_gampong/features/home/home_screen.dart';
import 'package:sapa_gampong/features/letters/tracking_screen.dart';
import 'package:sapa_gampong/features/prayer/prayer_screen.dart';
import 'package:sapa_gampong/features/profile/profile_screen.dart';
import 'package:sapa_gampong/features/services/services_screen.dart';
import 'package:sapa_gampong/features/verification/verification_screen.dart';

import '../support/resident_test_support.dart';

const _demographics = [
  DemographicBlock(
    key: 'jumlah_penduduk',
    label: 'Jumlah Penduduk',
    type: 'number',
    rawData: {'value': 1517},
  ),
  DemographicBlock(
    key: 'jumlah_kk',
    label: 'Jumlah Kepala Keluarga',
    type: 'number',
    rawData: {'value': 445},
  ),
];

GoRouter _router() => GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      name: AppRouteNames.home,
      builder: (_, _) => const HomeScreen(),
    ),
    GoRoute(
      path: '/layanan',
      name: AppRouteNames.services,
      builder: (_, _) => const ServicesScreen(),
    ),
    GoRoute(
      path: '/profil',
      name: AppRouteNames.profile,
      builder: (_, _) => const ProfileScreen(),
    ),
    GoRoute(
      path: '/demografi',
      name: AppRouteNames.demographics,
      builder: (_, _) => const DemographicsScreen(),
    ),
    GoRoute(
      path: '/jadwal-sholat',
      name: AppRouteNames.prayer,
      builder: (_, _) => const PrayerScreen(),
    ),
    GoRoute(
      path: '/lacak',
      name: AppRouteNames.tracking,
      builder: (_, _) => const TrackingScreen(),
    ),
    GoRoute(
      path: '/verify',
      name: AppRouteNames.verify,
      builder: (_, _) => const VerificationScreen(),
    ),
  ],
);

void main() {
  testWidgets('profile screen renders fallback village content', (
    tester,
  ) async {
    await pumpApp(tester);

    await scrollTo(tester, find.byKey(const Key('home-profile')));
    await tester.tap(find.byKey(const Key('home-profile')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('profile-village-name')), findsOneWidget);
    expect(find.text('Gampong Blang'), findsWidgets);

    await tester.tap(find.text('Perangkat'));
    await tester.pumpAndSettle();
    expect(find.text('Sofian'), findsWidgets);
    await scrollTo(tester, find.text('Afzalul Zikri'));
    expect(find.text('Afzalul Zikri'), findsWidgets);
  });

  testWidgets('demographics screen renders controlled data', (tester) async {
    await pumpApp(tester);

    await scrollTo(tester, find.byKey(const Key('home-demographics')));
    await tester.tap(find.byKey(const Key('home-demographics')));
    await tester.pumpAndSettle();

    expect(find.text('Jumlah Penduduk'), findsOneWidget);
    expect(find.text('1517'), findsOneWidget);
    expect(find.text('445'), findsOneWidget);
  });

  testWidgets('services screen links to tracking and verification', (
    tester,
  ) async {
    await pumpApp(tester);

    await tester.tap(find.byIcon(Icons.grid_view_outlined));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('service-tracking')));
    await tester.pumpAndSettle();
    expect(find.text('Lacak Permohonan'), findsOneWidget);

    await tester.tap(find.byTooltip('Kembali'));
    await tester.pumpAndSettle();
    await scrollTo(tester, find.byKey(const Key('service-verify')));
    await tester.tap(find.byKey(const Key('service-verify')));
    await tester.pumpAndSettle();
    expect(find.text('Cek surat resmi'), findsOneWidget);
    expect(find.byKey(const Key('verification-input')), findsOneWidget);
  });

  testWidgets('back arrow returns from profile to home', (tester) async {
    await pumpApp(tester);

    await scrollTo(tester, find.byKey(const Key('home-profile')));
    await tester.tap(find.byKey(const Key('home-profile')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('profile-village-name')), findsOneWidget);

    await tester.tap(find.byTooltip('Kembali'));
    await tester.pumpAndSettle();
    expect(find.text('Gampong Blang Digital'), findsOneWidget);
  });

  testWidgets('prayer screen renders fallback schedule and gps action', (
    tester,
  ) async {
    await pumpApp(tester);

    await scrollTo(tester, find.byKey(const Key('home-prayer')));
    await tester.tap(find.byKey(const Key('home-prayer')));
    await tester.pumpAndSettle();

    expect(find.text('Jadwal Sholat'), findsOneWidget);
    expect(find.text('Data contoh Gampong Blang'), findsOneWidget);
    expect(find.byKey(const Key('prayer-use-gps')), findsOneWidget);
    expect(find.textContaining('Subuh'), findsWidgets);
    expect(find.text('04:58 WIB'), findsOneWidget);
  });
}

Future<void> scrollTo(WidgetTester tester, Finder target) {
  return tester.scrollUntilVisible(
    target,
    300,
    scrollable: find.byType(Scrollable).first,
  );
}

Future<void> pumpApp(WidgetTester tester) async {
  tester.view.physicalSize = const Size(430, 980);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  final residentService = await residentSessionService(verified: false);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        bannersProvider.overrideWith((_) async => []),
        letterTypesProvider.overrideWith((_) async => sampleLetterTypes),
        residentSessionServiceProvider.overrideWithValue(residentService),
        residentRequestsProvider.overrideWith((_) async => []),
        residentFeedbackProvider.overrideWith((_) async => []),
        villageProfileProvider.overrideWith(
          (_) => Future.error(StateError('offline')),
        ),
        visionMissionProvider.overrideWith(
          (_) => Future.error(StateError('offline')),
        ),
        officialsProvider.overrideWith((_) async => []),
        strengthsProvider.overrideWith((_) async => []),
        socialLinksProvider.overrideWith((_) async => []),
        demographicsProvider.overrideWith((_) async => _demographics),
        prayerConfigProvider.overrideWith(
          (_) => Future.error(StateError('offline')),
        ),
        mosquesProvider.overrideWith((_) async => []),
      ],
      child: MaterialApp.router(routerConfig: _router()),
    ),
  );
  await tester.pumpAndSettle();
}
