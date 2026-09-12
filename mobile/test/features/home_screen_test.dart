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
import 'package:sapa_gampong/core/router/app_router.dart';
import 'package:sapa_gampong/features/home/home_screen.dart';

import '../support/resident_test_support.dart';

GoRouter _makeRouter() => GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      name: AppRouteNames.home,
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/layanan/surat',
      name: AppRouteNames.letterCatalog,
      builder: (context, state) => const Scaffold(),
    ),
    GoRoute(
      path: '/profil',
      name: AppRouteNames.profile,
      builder: (context, state) => const Scaffold(),
    ),
    GoRoute(
      path: '/demografis',
      name: AppRouteNames.demographics,
      builder: (context, state) => const Scaffold(),
    ),
    GoRoute(
      path: '/jadwal-sholat',
      name: AppRouteNames.prayer,
      builder: (context, state) => const Scaffold(),
    ),
    GoRoute(
      path: '/pelaporan',
      name: AppRouteNames.feedback,
      builder: (context, state) => const Scaffold(),
    ),
    GoRoute(
      path: '/galeri',
      name: AppRouteNames.gallery,
      builder: (context, state) => const Scaffold(),
    ),
    GoRoute(
      path: '/lacak',
      name: AppRouteNames.tracking,
      builder: (context, state) => const Scaffold(),
    ),
    GoRoute(
      path: '/permohonan-saya',
      name: AppRouteNames.myRequests,
      builder: (context, state) => const Scaffold(),
    ),
    GoRoute(
      path: '/laporan-saya',
      name: AppRouteNames.myFeedback,
      builder: (context, state) => const Scaffold(),
    ),
    GoRoute(
      path: '/pengaturan',
      name: AppRouteNames.settings,
      builder: (context, state) => const Scaffold(),
    ),
  ],
);

Future<Widget> _buildWithSlides(
  List<BannerSlide> slides, {
  ResidentSession? session,
  bool verified = false,
  List<ResidentRequestItem> requests = const [],
  List<ResidentFeedbackItem> feedback = const [],
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
      residentRequestsProvider.overrideWith((_) async => requests),
      residentFeedbackProvider.overrideWith((_) async => feedback),
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
    requiredAttachments: ['KTP'],
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
    requiredAttachments: ['KTP'],
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

  testWidgets('shows gallery entry point on the home grid', (tester) async {
    await tester.pumpWidget(await _buildWithSlides([]));
    await tester.pump();

    expect(find.byKey(const Key('home-gallery')), findsOneWidget);
    expect(find.text('Galeri'), findsOneWidget);
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
    expect(
      find.textContaining('permohonan dan laporan akan tampil'),
      findsOneWidget,
    );
  });

  testWidgets('permohonan section shows latest request and feedback', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      await _buildWithSlides(
        [slide1],
        verified: true,
        requests: [
          ResidentRequestItem(
            id: 'req-1',
            referenceCode: 'GB-2026-000001',
            letterType: 'L1',
            status: 'SUBMITTED',
            statusLabel: 'Diajukan',
            createdAt: DateTime(2026, 7, 23),
            updatedAt: DateTime(2026, 7, 23),
          ),
        ],
        feedback: [
          ResidentFeedbackItem(
            id: 'fb-1',
            referenceCode: 'LPR-A1B2C',
            name: 'Budi',
            email: testResidentSession.email,
            body: 'Lampu jalan mati.',
            status: 'responded',
            createdAt: DateTime(2026, 7, 24),
            reply: 'Sudah diteruskan ke petugas.',
          ),
        ],
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('home-latest-request')), findsOneWidget);
    expect(find.byKey(const Key('home-latest-feedback')), findsOneWidget);
    expect(find.text('GB-2026-000001'), findsOneWidget);
    expect(find.text('LPR-A1B2C'), findsOneWidget);
    expect(find.text('Dibalas'), findsOneWidget);
    expect(
      tester.getTopLeft(find.byKey(const Key('home-latest-request-status'))).dy,
      lessThan(tester.getTopLeft(find.text('GB-2026-000001')).dy),
    );
    expect(find.text('Lihat surat'), findsOneWidget);
    expect(find.text('Lihat laporan'), findsOneWidget);
  });
}
