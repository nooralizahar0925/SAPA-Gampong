import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sapa_gampong/core/network/dio_client.dart';
import 'package:sapa_gampong/data/providers/letter_providers.dart';
import 'package:sapa_gampong/data/repositories/letter_repository.dart';
import 'package:sapa_gampong/features/letters/tracking_screen.dart';

LetterRepository _fakeRepo({
  Map<String, Object?>? data,
  bool fail = false,
  Completer<void>? gate,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'http://test'));
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (opts, handler) async {
        await gate?.future;
        if (fail) {
          handler.reject(
            DioException(requestOptions: opts, message: 'not found'),
          );
        } else {
          handler.resolve(
            Response(requestOptions: opts, statusCode: 200, data: data),
          );
        }
      },
    ),
  );
  return LetterRepository(DioClient(dio: dio));
}

const _trackResponse = {
  'reference_code': 'BLG-TEST',
  'letter_type': 'Surat Keterangan Berdomisili',
  'status': 'IN_REVIEW',
  'status_label': 'Sedang Ditinjau',
  'created_at': '2026-07-21T09:30:00Z',
  'updated_at': '2026-07-21T09:41:00Z',
  'status_history': [
    {'status': 'SUBMITTED', 'at': '2026-07-21T09:30:00Z', 'action': 'submit'},
    {
      'status': 'IN_REVIEW',
      'at': '2026-07-21T09:41:00Z',
      'action': 'in_review',
    },
  ],
};

const _approvedTrackResponse = {
  'reference_code': 'GB-2026-000001',
  'letter_type': 'L10',
  'status': 'APPROVED',
  'status_label': 'Disetujui',
  'created_at': '2026-07-23T06:30:00Z',
  'updated_at': '2026-07-23T06:46:00Z',
  'status_history': [
    {'status': 'SUBMITTED', 'at': '2026-07-23T06:30:00Z', 'action': 'submit'},
    {
      'status': 'IN_REVIEW',
      'at': '2026-07-23T06:40:00Z',
      'action': 'in_review',
    },
    {'status': 'APPROVED', 'at': '2026-07-23T06:46:00Z', 'action': 'approve'},
  ],
};

Widget _buildApp(LetterRepository repo) => ProviderScope(
  overrides: [letterRepositoryProvider.overrideWithValue(repo)],
  child: MaterialApp.router(
    routerConfig: GoRouter(
      routes: [GoRoute(path: '/', builder: (_, _) => const TrackingScreen())],
    ),
  ),
);

void main() {
  group('TrackingScreen', () {
    testWidgets('starts with empty field and no result', (tester) async {
      await tester.pumpWidget(_buildApp(_fakeRepo(data: _trackResponse)));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('tracking-reference-code')), findsNothing);
      expect(find.byKey(const Key('tracking-error')), findsNothing);
    });

    testWidgets('shows loading indicator while fetching', (tester) async {
      final gate = Completer<void>();
      await tester.pumpWidget(
        _buildApp(_fakeRepo(data: _trackResponse, gate: gate)),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'BLG-TEST');
      await tester.tap(find.byKey(const Key('tracking-search')));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsWidgets);

      gate.complete();
      await tester.pumpAndSettle();
    });

    testWidgets('shows reference code and status label on success', (
      tester,
    ) async {
      await tester.pumpWidget(_buildApp(_fakeRepo(data: _trackResponse)));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'BLG-TEST');
      await tester.tap(find.byKey(const Key('tracking-search')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('tracking-reference-code')), findsOneWidget);
      expect(find.text('BLG-TEST'), findsAtLeastNWidgets(1));
      expect(find.text('Sedang Ditinjau'), findsOneWidget);
      expect(find.text('Surat Keterangan Berdomisili'), findsOneWidget);
    });

    testWidgets('marks correct steps as done for under_review status', (
      tester,
    ) async {
      await tester.pumpWidget(_buildApp(_fakeRepo(data: _trackResponse)));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'BLG-TEST');
      await tester.tap(find.byKey(const Key('tracking-search')));
      await tester.pumpAndSettle();

      // Steps 0 and 1 are done; step 2 is current.
      expect(find.text('Permohonan diajukan'), findsOneWidget);
      expect(find.text('Diterima di kantor keuchik'), findsOneWidget);
      expect(find.text('Ditinjau petugas'), findsOneWidget);
      // The middle synthetic step has no backend event; submitted/review use dates.
      expect(find.text('Selesai'), findsOneWidget);
      expect(find.text('21 Jul 2026 · 09.30 WIB'), findsOneWidget);
      expect(find.text('21 Jul 2026 · 09.41 WIB'), findsOneWidget);
    });

    testWidgets('marks approved status through approval step', (tester) async {
      await tester.pumpWidget(
        _buildApp(_fakeRepo(data: _approvedTrackResponse)),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'GB-2026-000001');
      await tester.tap(find.byKey(const Key('tracking-search')));
      await tester.pumpAndSettle();

      expect(find.text('Disetujui'), findsOneWidget);
      expect(find.text('Disetujui Keuchik'), findsOneWidget);
      expect(find.text('Selesai'), findsOneWidget);
      expect(find.text('23 Jul 2026 · 06.46 WIB'), findsAtLeastNWidgets(1));
    });

    testWidgets('shows error card when code not found', (tester) async {
      await tester.pumpWidget(_buildApp(_fakeRepo(fail: true)));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'INVALID');
      await tester.tap(find.byKey(const Key('tracking-search')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('tracking-error')), findsOneWidget);
      expect(
        find.text(
          'Kode tidak ditemukan. Periksa kembali kode permohonan Anda.',
        ),
        findsOneWidget,
      );
      expect(find.byKey(const Key('tracking-reference-code')), findsNothing);
    });
  });
}
