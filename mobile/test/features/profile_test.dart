import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sapa_gampong/data/models/official.dart';
import 'package:sapa_gampong/data/models/social_media_link.dart';
import 'package:sapa_gampong/data/models/village_profile.dart';
import 'package:sapa_gampong/data/models/village_strength.dart';
import 'package:sapa_gampong/data/models/vision_mission.dart';
import 'package:sapa_gampong/data/providers/content_providers.dart';
import 'package:sapa_gampong/features/profile/profile_screen.dart';

const _profile = VillageProfile(
  name: 'Gampong Blang Test',
  kecamatan: 'Krueng Sabee',
  kabupaten: 'Aceh Jaya',
  kemukiman: 'Calang',
  areaSize: '1.300 ha',
  elevation: '3,4 mdpl',
  description: 'Deskripsi desa dari API.',
  mapLat: 4.6342,
  mapLng: 95.5820,
);

const _visionMission = VisionMission(
  vision: 'Visi dari API yang lebih baik.',
  missions: ['Misi pertama dari API.', 'Misi kedua dari API.'],
);

const _officials = [
  Official(
    id: 'o1',
    name: 'Sofian API',
    role: 'Keuchik',
    isLeadershipHighlight: true,
  ),
  Official(id: 'o2', name: 'Afzalul API', role: 'Sekretaris Gampong'),
];

const _strengths = [
  VillageStrength(id: 's1', title: 'Pertanian API', body: 'Sawah yang subur.'),
  VillageStrength(id: 's2', title: 'Perikanan API', body: 'Dekat laut.'),
];

const _socialLinks = [
  SocialMediaLink(
    id: 'soc1',
    platform: SocialMediaPlatform.instagram,
    label: 'Instagram Gampong Blang',
    url: 'https://www.instagram.com/gampongblang',
    iconUrl:
        'https://www.google.com/s2/favicons?sz=64&domain_url=https://instagram.com',
  ),
  SocialMediaLink(
    id: 'soc2',
    platform: SocialMediaPlatform.youtube,
    label: 'YouTube Gampong Blang',
    url: 'https://www.youtube.com/@gampongblang',
    active: false,
  ),
];

Widget _buildApp({
  AsyncValue<VillageProfile>? profileOverride,
  AsyncValue<VisionMission>? vmOverride,
  AsyncValue<List<Official>>? officialsOverride,
  AsyncValue<List<VillageStrength>>? strengthsOverride,
  AsyncValue<List<SocialMediaLink>>? socialLinksOverride,
}) {
  return ProviderScope(
    overrides: [
      villageProfileProvider.overrideWith(
        (_) async =>
            (profileOverride as AsyncData<VillageProfile>?)?.value ?? _profile,
      ),
      visionMissionProvider.overrideWith(
        (_) async =>
            (vmOverride as AsyncData<VisionMission>?)?.value ?? _visionMission,
      ),
      officialsProvider.overrideWith(
        (_) async =>
            (officialsOverride as AsyncData<List<Official>>?)?.value ??
            _officials,
      ),
      strengthsProvider.overrideWith(
        (_) async =>
            (strengthsOverride as AsyncData<List<VillageStrength>>?)?.value ??
            _strengths,
      ),
      socialLinksProvider.overrideWith(
        (_) async =>
            (socialLinksOverride as AsyncData<List<SocialMediaLink>>?)?.value ??
            _socialLinks,
      ),
    ],
    child: MaterialApp.router(
      routerConfig: GoRouter(
        initialLocation: '/',
        routes: [GoRoute(path: '/', builder: (_, __) => const ProfileScreen())],
      ),
    ),
  );
}

void main() {
  test('office map uses dashboard coordinates when configured', () {
    final uri = officeMapUri(_profile);

    expect(uri.host, 'www.google.com');
    expect(uri.path, '/maps/search/');
    expect(uri.queryParameters['query'], '4.6342,95.582');
  });

  test('office map falls back to the village address', () {
    final uri = officeMapUri(
      const VillageProfile(
        name: 'Gampong Blang',
        kecamatan: 'Krueng Sabee',
        kabupaten: 'Aceh Jaya',
      ),
    );

    expect(
      uri.queryParameters['query'],
      'Kantor Gampong Blang, Krueng Sabee, Aceh Jaya, Aceh',
    );
  });

  testWidgets('Tab 1: shows loading indicator while profile loads', (
    tester,
  ) async {
    final completer = Completer<VillageProfile>();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          villageProfileProvider.overrideWith((_) => completer.future),
          visionMissionProvider.overrideWith((_) async => _visionMission),
          officialsProvider.overrideWith((_) async => _officials),
          strengthsProvider.overrideWith((_) async => _strengths),
          socialLinksProvider.overrideWith((_) async => _socialLinks),
        ],
        child: MaterialApp.router(
          routerConfig: GoRouter(
            initialLocation: '/',
            routes: [
              GoRoute(path: '/', builder: (_, __) => const ProfileScreen()),
            ],
          ),
        ),
      ),
    );
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    completer.complete(_profile);
  });

  testWidgets('Tab 1: renders village name and description from API', (
    tester,
  ) async {
    await tester.pumpWidget(_buildApp());
    await tester.pump();

    expect(find.byKey(const Key('profile-village-name')), findsOneWidget);
    expect(find.text('Gampong Blang Test'), findsWidgets);
    expect(find.byKey(const Key('profile-description')), findsOneWidget);
    expect(find.text('Deskripsi desa dari API.'), findsOneWidget);
  });

  testWidgets('Tab 1: shows active social links below profile content', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(430, 1400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_buildApp());
    await tester.pump();

    await tester.scrollUntilVisible(
      find.byKey(const Key('profile-social-soc1')),
      300,
      scrollable: find.byType(Scrollable).first,
    );

    expect(find.text('Media Sosial'), findsOneWidget);
    expect(find.text('Instagram Gampong Blang'), findsOneWidget);
    expect(find.text('Instagram'), findsOneWidget);
    expect(find.text('YouTube Gampong Blang'), findsNothing);
  });

  testWidgets('Tab 1: shows seed fallback when profile is null', (
    tester,
  ) async {
    // Simulate error → fallback to seed content.
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          villageProfileProvider.overrideWith((_) => Future.error('err')),
          visionMissionProvider.overrideWith((_) async => _visionMission),
          officialsProvider.overrideWith((_) async => _officials),
          strengthsProvider.overrideWith((_) async => _strengths),
          socialLinksProvider.overrideWith((_) async => _socialLinks),
        ],
        child: MaterialApp.router(
          routerConfig: GoRouter(
            initialLocation: '/',
            routes: [
              GoRoute(path: '/', builder: (_, __) => const ProfileScreen()),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    // Seed name shown.
    expect(find.text('Gampong Blang'), findsWidgets);
  });

  testWidgets('Tab 2: shows vision from API after tab tap', (tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_buildApp());
    await tester.pump();

    await tester.tap(find.text('Visi & Misi'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('profile-vision-text')), findsOneWidget);
    expect(
      find.textContaining('Visi dari API yang lebih baik.'),
      findsOneWidget,
    );
    expect(find.text('Misi pertama dari API.'), findsOneWidget);
  });

  testWidgets('Tab 2: strengths from API shown after tab tap', (tester) async {
    tester.view.physicalSize = const Size(800, 2000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_buildApp());
    await tester.pump();

    await tester.tap(find.text('Visi & Misi'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('strength-s1')), findsOneWidget);
    expect(find.text('Pertanian API'), findsOneWidget);
    expect(find.byKey(const Key('strength-s2')), findsOneWidget);
  });

  testWidgets('Tab 3: shows officials from API after tab tap', (tester) async {
    await tester.pumpWidget(_buildApp());
    await tester.pump();

    await tester.tap(find.text('Perangkat'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('official-o1')), findsOneWidget);
    expect(find.text('Sofian API'), findsOneWidget);
    expect(find.text('Keuchik'), findsOneWidget);
    expect(find.byKey(const Key('official-o2')), findsOneWidget);
  });

  testWidgets('Tab 3: shows seed officials when API returns empty', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          villageProfileProvider.overrideWith((_) async => _profile),
          visionMissionProvider.overrideWith((_) async => _visionMission),
          officialsProvider.overrideWith((_) async => <Official>[]),
          strengthsProvider.overrideWith((_) async => _strengths),
          socialLinksProvider.overrideWith((_) async => _socialLinks),
        ],
        child: MaterialApp.router(
          routerConfig: GoRouter(
            initialLocation: '/',
            routes: [
              GoRoute(path: '/', builder: (_, __) => const ProfileScreen()),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    await tester.tap(find.text('Perangkat'));
    await tester.pumpAndSettle();

    // Seed fallback shows "Sofian" (the original seed keuchik).
    expect(find.text('Sofian'), findsOneWidget);
  });
}
