import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sapa_gampong/data/models/banner_slide.dart';
import 'package:sapa_gampong/data/models/field_spec.dart';
import 'package:sapa_gampong/data/models/letter_type.dart';
import 'package:sapa_gampong/data/models/resident_session.dart';
import 'package:sapa_gampong/data/providers/content_providers.dart';
import 'package:sapa_gampong/data/providers/letter_providers.dart';
import 'package:sapa_gampong/data/providers/resident_providers.dart';
import 'package:sapa_gampong/features/home/home_screen.dart';

import '../support/resident_test_support.dart';

GoRouter _makeRouter() => GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
    GoRoute(path: '/layanan/surat', builder: (_, __) => const Scaffold()),
    GoRoute(path: '/profil', builder: (_, __) => const Scaffold()),
    GoRoute(path: '/demografis', builder: (_, __) => const Scaffold()),
    GoRoute(path: '/jadwal-sholat', builder: (_, __) => const Scaffold()),
    GoRoute(path: '/feedback', builder: (_, __) => const Scaffold()),
    GoRoute(path: '/lacak', builder: (_, __) => const Scaffold()),
    GoRoute(path: '/permohonan', builder: (_, __) => const Scaffold()),
    GoRoute(path: '/pengaturan', builder: (_, __) => const Scaffold()),
  ],
);

Future<Widget> _buildWithSlides(
  List<BannerSlide> slides, {
  ResidentSession? session,
  bool verified = false,
}) async {
  final residentService = await residentSessionService(
    session: session,
    verified: verified,
  );
  return ProviderScope(
    overrides: [
      bannersProvider.overrideWith((_) async => slides),
      letterTypesProvider.overrideWith((_) async => _letterTypes),
      residentSessionServiceProvider.overrideWithValue(residentService),
    ],
    child: MaterialApp.router(routerConfig: _makeRouter()),
  );
}

const _letterTypes = [
  LetterType(
    code: 'L1',
    name: 'Surat Keterangan Berdomisili',
    description: 'Keterangan domisili warga.',
    subjectIsApplicant: true,
    requiredAttachments: ['KTP', 'KK'],
    fields: [
      FieldSpec(
        key: 'nama',
        label: 'Nama',
        type: FieldType.text,
        required: true,
      ),
    ],
  ),
  LetterType(
    code: 'L4',
    name: 'Surat Keterangan Miskin',
    description: 'SKTM untuk bantuan.',
    subjectIsApplicant: true,
    requiredAttachments: ['KTP', 'KK'],
    fields: [],
  ),
];

void main() {
  const slide1 = BannerSlide(id: 's1', imageFileId: 'file-1');
  const slide2 = BannerSlide(id: 's2', imageFileId: 'file-2');

  testWidgets('shows fallback banner while loading', (tester) async {
    final completer = Completer<List<BannerSlide>>();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          bannersProvider.overrideWith((_) => completer.future),
          letterTypesProvider.overrideWith((_) async => _letterTypes),
        ],
        child: MaterialApp.router(routerConfig: _makeRouter()),
      ),
    );
    // Still loading: the top slot stays a banner, not the announcement card.
    expect(find.byKey(const Key('home-banner-fallback')), findsOneWidget);
    completer.complete([]);
  });

  testWidgets('shows fallback banner when list is empty', (tester) async {
    await tester.pumpWidget(await _buildWithSlides([]));
    await tester.pump();
    expect(find.byKey(const Key('home-banner-fallback')), findsOneWidget);
  });

  testWidgets('ignores inactive dashboard banners', (tester) async {
    const inactive = BannerSlide(
      id: 'inactive',
      imageFileId: 'file-inactive',
      active: false,
    );

    await tester.pumpWidget(await _buildWithSlides([inactive]));
    await tester.pump();

    expect(find.byKey(const Key('home-banner-fallback')), findsOneWidget);
    expect(find.byKey(const Key('home-banner-carousel')), findsNothing);
  });

  testWidgets('shows dashboard banner carousel when banners loaded', (
    tester,
  ) async {
    await tester.pumpWidget(await _buildWithSlides([slide1]));
    await tester.pump();
    expect(find.byKey(const Key('home-banner-carousel')), findsOneWidget);
    expect(find.byKey(const Key('home-banner-fallback')), findsNothing);
  });

  testWidgets('carousel renders first slide of two', (tester) async {
    await tester.pumpWidget(await _buildWithSlides([slide1, slide2]));
    await tester.pump();
    expect(find.byKey(const Key('home-banner-carousel')), findsOneWidget);
    expect(find.byType(PageView), findsOneWidget);
  });

  testWidgets('shows pengumuman placeholder below layanan lainnya', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 2200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(await _buildWithSlides([slide1]));
    await tester.pump();

    expect(find.byKey(const Key('home-announcement-carousel')), findsOneWidget);
    expect(find.text('Pengumuman'), findsOneWidget);
    expect(find.text('Fitur pengumuman sedang dikembangkan'), findsOneWidget);
    expect(find.textContaining('Informasi resmi'), findsOneWidget);

    final bannerTop = tester
        .getTopLeft(find.byKey(const Key('home-banner-carousel')))
        .dy;
    final announcementTop = tester
        .getTopLeft(find.byKey(const Key('home-announcement-carousel')))
        .dy;
    final suratTop = tester
        .getTopLeft(find.byKey(const Key('home-letter-request')))
        .dy;
    final layananTileTop = tester
        .getTopLeft(find.byKey(const Key('home-feedback')))
        .dy;

    expect(bannerTop, lessThan(suratTop));
    expect(suratTop, lessThan(layananTileTop));
    expect(layananTileTop, lessThan(announcementTop));
  });

  testWidgets('primary letter-request card is present', (tester) async {
    await tester.pumpWidget(await _buildWithSlides([slide1]));
    await tester.pump();
    expect(find.byKey(const Key('home-letter-request')), findsOneWidget);
    expect(find.text('2 jenis surat keterangan resmi'), findsOneWidget);
  });

  testWidgets('feature tiles are rendered', (tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(await _buildWithSlides([slide1]));
    await tester.pump();

    expect(find.byKey(const Key('home-profile')), findsOneWidget);
    expect(find.byKey(const Key('home-demographics')), findsOneWidget);
    expect(find.byKey(const Key('home-prayer')), findsOneWidget);
    expect(find.byKey(const Key('home-feedback')), findsOneWidget);
  });

  testWidgets('permohonan section asks for verified email first', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 2000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(await _buildWithSlides([slide1], verified: false));
    await tester.pumpAndSettle();

    expect(find.text('Permohonan Anda'), findsOneWidget);
    expect(find.text('Verifikasi email'), findsOneWidget);
    expect(find.textContaining('permohonan akan tampil'), findsOneWidget);
  });
}
