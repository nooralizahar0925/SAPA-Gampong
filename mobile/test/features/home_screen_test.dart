import 'dart:async';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:dio/dio.dart';
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
import 'package:sapa_gampong/core/network/dio_client.dart';
import 'package:sapa_gampong/data/providers/cache_providers.dart';
import 'package:sapa_gampong/data/services/content_cache_service.dart';
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
  Dio? imageDio,
  ApiFileCacheService? imageCache,
}) async {
  final residentService = await residentSessionService(
    session: session,
    verified: verified,
  );
  return ProviderScope(
    overrides: [
      if (imageDio != null)
        dioClientProvider.overrideWithValue(DioClient(dio: imageDio)),
      if (imageCache != null)
        apiFileCacheServiceProvider.overrideWithValue(imageCache),
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

  testWidgets('automatic sliding skips a failed banner image', (tester) async {
    final dio = Dio();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (o, h) {
          h.reject(DioException(requestOptions: o, error: 'Offline'));
        },
      ),
    );
    await tester.pumpWidget(
      await _buildWithSlides(
        const [
          BannerSlide(id: 'first', imageFileId: 'first'),
          BannerSlide(
            id: 'bad',
            imageFileId: 'bad',
            imageUrl: 'https://example.test/bad',
          ),
          BannerSlide(id: 'third', imageFileId: 'third'),
        ],
        imageDio: dio,
        imageCache: MemoryApiFileCacheService(),
      ),
    );
    await tester.pump();
    await tester.pump();
    await tester.pump(const Duration(seconds: 5));
    await tester.pump(const Duration(milliseconds: 400));
    final carousel = find.descendant(
      of: find.byKey(const Key('home-banner-carousel')),
      matching: find.byType(PageView),
    );
    expect(tester.widget<PageView>(carousel).controller!.page, 2);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('pending image completion after leaving home is harmless', (
    tester,
  ) async {
    final response = Completer<List<int>>();
    final dio = Dio();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (o, h) async {
          h.resolve(
            Response(
              requestOptions: o,
              data: await response.future,
              statusCode: 200,
            ),
          );
        },
      ),
    );
    await tester.pumpWidget(
      await _buildWithSlides(
        const [
          BannerSlide(
            id: 'pending',
            imageFileId: 'pending',
            imageUrl: 'https://example.test/pending',
          ),
        ],
        imageDio: dio,
        imageCache: MemoryApiFileCacheService(),
      ),
    );
    await tester.pump();
    await tester.pumpWidget(const SizedBox());
    response.complete([1, 2, 3]);
    await tester.pump(const Duration(milliseconds: 1));
    await tester.pump(const Duration(milliseconds: 1));
    expect(tester.takeException(), isNull);
  });

  testWidgets('does not advance until current and next images are decoded', (
    tester,
  ) async {
    final bytes = await tester.runAsync(() async {
      final recorder = ui.PictureRecorder();
      Canvas(recorder).drawColor(Colors.green, BlendMode.src);
      final picture = recorder.endRecording();
      final image = await picture.toImage(80, 40);
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      image.dispose();
      picture.dispose();
      return data!.buffer.asUint8List();
    });
    final first = Completer<Uint8List>();
    final second = Completer<Uint8List>();
    final dio = Dio();
    final requested = <String>[];
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (o, h) async {
          requested.add(o.path);
          h.resolve(
            Response(
              requestOptions: o,
              statusCode: 200,
              data: await (o.path.endsWith('first')
                  ? first.future
                  : second.future),
            ),
          );
        },
      ),
    );
    await tester.pumpWidget(
      await _buildWithSlides(
        const [
          BannerSlide(
            id: 'first',
            imageFileId: 'first',
            imageUrl: 'https://example.test/first',
          ),
          BannerSlide(
            id: 'second',
            imageFileId: 'second',
            imageUrl: 'https://example.test/second',
          ),
        ],
        imageDio: dio,
        imageCache: MemoryApiFileCacheService(),
      ),
    );
    await tester.pump();
    final carousel = find.descendant(
      of: find.byKey(const Key('home-banner-carousel')),
      matching: find.byType(PageView),
    );
    PageController controller() =>
        tester.widget<PageView>(carousel).controller!;
    await tester.pump(const Duration(seconds: 10));
    expect(controller().page, 0);
    first.complete(bytes!);
    await tester.pump();
    await tester.runAsync(
      () async => Future<void>.delayed(const Duration(milliseconds: 60)),
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 10));
    expect(controller().page, 0);
    expect(requested, contains('https://example.test/second'));
    second.complete(bytes);
    await tester.pump();
    await tester.runAsync(
      () async => Future<void>.delayed(const Duration(milliseconds: 60)),
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 4));
    expect(controller().page, 0);
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(milliseconds: 400));
    expect(controller().page, 1);
    expect(requested.length, 2);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

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
    expect(
      tester.getSize(find.byKey(const Key('home-banner-fallback'))).height,
      220,
    );
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
    expect(
      tester.getSize(find.byKey(const Key('home-banner-carousel'))).height,
      220,
    );
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
