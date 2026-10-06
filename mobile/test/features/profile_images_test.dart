import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/core/network/dio_client.dart';
import 'package:sapa_gampong/core/widgets/cached_api_image.dart';
import 'package:sapa_gampong/data/models/official.dart';
import 'package:sapa_gampong/data/models/village_profile.dart';
import 'package:sapa_gampong/data/models/vision_mission.dart';
import 'package:sapa_gampong/data/providers/content_providers.dart';
import 'package:sapa_gampong/data/providers/letter_providers.dart';
import 'package:sapa_gampong/features/profile/profile_screen.dart';

Future<Uint8List> _png(int width, int height) async {
  final recorder = ui.PictureRecorder();
  Canvas(recorder).drawColor(Colors.green, BlendMode.src);
  final picture = recorder.endRecording();
  final image = await picture.toImage(width, height);
  final data = await image.toByteData(format: ui.ImageByteFormat.png);
  image.dispose();
  picture.dispose();
  return data!.buffer.asUint8List();
}

Widget _app(Uint8List bytes, {bool withProfilePhoto = false}) {
  final dio = Dio();
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        handler.resolve(
          Response(requestOptions: options, data: bytes, statusCode: 200),
        );
      },
    ),
  );
  return ProviderScope(
    overrides: [
      dioClientProvider.overrideWithValue(DioClient(dio: dio)),
      villageProfileProvider.overrideWith(
        (_) async => VillageProfile(
          name: 'Gampong Blang',
          photoUrl: withProfilePhoto
              ? 'https://example.test/profile.png'
              : null,
          photoFileId: withProfilePhoto ? 'profile' : null,
        ),
      ),
      socialLinksProvider.overrideWith((_) async => []),
      visionMissionProvider.overrideWith(
        (_) async => const VisionMission(vision: 'Visi', missions: ['Misi']),
      ),
      strengthsProvider.overrideWith((_) async => []),
      officialsProvider.overrideWith(
        (_) async => const [
          Official(
            id: 'leader',
            name:
                'Nama pemimpin panjang untuk memastikan kartu dapat menyesuaikan tinggi',
            role: 'Keuchik Gampong Blang',
            photoUrl: 'https://example.test/leader.png',
            photoFileId: 'leader-photo',
            isLeadershipHighlight: true,
          ),
          Official(
            id: 'staff',
            name: 'Perangkat Foto',
            role: 'Sekretaris',
            photoUrl: 'https://example.test/staff.png',
            photoFileId: 'staff-photo',
          ),
          Official(id: 'no-photo', name: 'Perangkat Tanpa Foto', role: 'Kaur'),
        ],
      ),
    ],
    child: const MaterialApp(home: ProfileScreen()),
  );
}

void main() {
  for (final dimensions in [(160, 90), (90, 160)]) {
    testWidgets(
      'Tentang preserves ${dimensions.$1}:${dimensions.$2} image ratio',
      (tester) async {
        final bytes = await tester.runAsync(
          () => _png(dimensions.$1, dimensions.$2),
        );
        await tester.pumpWidget(_app(bytes!, withProfilePhoto: true));
        await tester.pumpAndSettle();
        // Give the asynchronous codec time to decode the in-memory PNG.
        await tester.runAsync(
          () async => Future<void>.delayed(const Duration(milliseconds: 50)),
        );
        await tester.pumpAndSettle();
        final image = find.byType(Image);
        expect(image, findsOneWidget);
        final size = tester.getSize(image);
        expect(size.width, closeTo(768, 1));
        expect(
          size.width / size.height,
          closeTo(dimensions.$1 / dimensions.$2, 0.01),
        );
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'leader and staff display API photos with uncropped fit and missing-photo fallback',
    (tester) async {
      tester.view.physicalSize = const Size(360, 1400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final bytes = await tester.runAsync(() => _png(80, 100));
      await tester.pumpWidget(_app(bytes!));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Visi & Misi'));
      await tester.pumpAndSettle();
      final leader = tester.widget<CachedApiImage>(
        find
            .byWidgetPredicate(
              (w) => w is CachedApiImage && w.cacheKey == 'leader-photo',
            )
            .first,
      );
      expect(leader.url, 'https://example.test/leader.png');
      expect(leader.fit, BoxFit.contain);
      expect(leader.height, 80);
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Perangkat'));
      await tester.pumpAndSettle();
      final staff = tester.widget<CachedApiImage>(
        find
            .byWidgetPredicate(
              (w) => w is CachedApiImage && w.cacheKey == 'staff-photo',
            )
            .last,
      );
      expect(staff.url, 'https://example.test/staff.png');
      expect(staff.fit, BoxFit.contain);
      expect(find.byKey(const Key('official-no-photo')), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'missing and corrupt image bytes show fallback without exceptions',
    (tester) async {
      final dio = Dio();
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (o, h) => h.resolve(
            Response(requestOptions: o, data: [1, 2, 3], statusCode: 200),
          ),
        ),
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [dioClientProvider.overrideWithValue(DioClient(dio: dio))],
          child: const MaterialApp(
            home: Column(
              children: [
                CachedApiImage(
                  url: null,
                  cacheKey: null,
                  fallback: Text('No photo'),
                ),
                CachedApiImage(
                  url: 'https://example.test/corrupt',
                  cacheKey: 'corrupt',
                  fallback: Text('Bad photo'),
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.runAsync(
        () async => Future<void>.delayed(const Duration(milliseconds: 50)),
      );
      await tester.pumpAndSettle();
      expect(find.text('No photo'), findsOneWidget);
      expect(find.text('Bad photo'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
