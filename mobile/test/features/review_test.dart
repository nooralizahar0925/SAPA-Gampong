import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sapa_gampong/core/network/dio_client.dart';
import 'package:sapa_gampong/data/models/attachment.dart';
import 'package:sapa_gampong/data/models/letter_type.dart';
import 'package:sapa_gampong/data/providers/letter_providers.dart';
import 'package:sapa_gampong/data/providers/submission_queue_providers.dart';
import 'package:sapa_gampong/data/repositories/letter_repository.dart';
import 'package:sapa_gampong/data/services/submission_queue_service.dart';
import 'package:sapa_gampong/features/letters/letter_form_screen.dart';
import 'package:sapa_gampong/features/letters/review_screen.dart';

const _type = LetterType(
  code: 'L1',
  name: 'Surat Keterangan Berdomisili',
  description: '',
  subjectIsApplicant: true,
  requiredAttachments: ['KTP'],
  fields: [],
);

final _baseDraft = LetterFlowDraft(
  letterType: _type,
  applicantName: 'Budi Santoso',
  applicantEmail: 'budi@test.com',
  applicantPhone: '081234567890',
  subjectData: {},
  attachments: const [Attachment(fileId: 'f1', kind: 'KTP')],
);

LetterRepository _fakeRepo({
  String referenceCode = 'BLG-TEST',
  bool fail = false,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'http://test'));
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (opts, handler) {
        if (fail) {
          handler.reject(
            DioException(requestOptions: opts, message: 'Network error'),
          );
        } else {
          handler.resolve(
            Response(
              requestOptions: opts,
              statusCode: 200,
              data: {
                'id': '1',
                'reference_code': referenceCode,
                'status': 'pending',
              },
            ),
          );
        }
      },
    ),
  );
  return LetterRepository(DioClient(dio: dio));
}

Widget _buildApp(
  LetterFlowDraft draft, {
  LetterRepository? repo,
  SubmissionQueueService? queue,
}) {
  return ProviderScope(
    overrides: [
      if (repo != null) letterRepositoryProvider.overrideWithValue(repo),
      if (queue != null) submissionQueueProvider.overrideWithValue(queue),
    ],
    child: MaterialApp.router(
      routerConfig: GoRouter(
        routes: [
          GoRoute(
            path: '/',
            builder: (_, __) => ReviewScreen(flowDraft: draft),
          ),
          GoRoute(
            path: '/layanan/surat/berhasil',
            name: 'success',
            builder: (_, __) => const Scaffold(body: Text('berhasil')),
          ),
          GoRoute(
            path: '/layanan/surat/form',
            name: 'letterForm',
            builder: (_, __) => const Scaffold(body: Text('form')),
          ),
        ],
      ),
    ),
  );
}

void main() {
  // Make the test viewport tall enough that the full ListView renders without
  // lazy-loading gaps (checkbox and submit button would otherwise be off-screen).
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  group('ReviewScreen', () {
    testWidgets('displays applicant data in summary', (tester) async {
      tester.view.physicalSize = const Size(800, 1800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_buildApp(_baseDraft));
      await tester.pumpAndSettle();

      expect(find.text('Budi Santoso'), findsOneWidget);
      expect(find.text('budi@test.com'), findsAtLeastNWidgets(1));
      expect(find.text('081234567890'), findsOneWidget);
    });

    testWidgets('submit button disabled without confirmation', (tester) async {
      tester.view.physicalSize = const Size(800, 1800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_buildApp(_baseDraft));
      await tester.pumpAndSettle();

      final button = tester.widget<FilledButton>(
        find.byKey(const Key('review-submit')),
      );
      expect(button.onPressed, isNull);
    });

    testWidgets('submit button enabled after ticking confirmation', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(800, 1800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_buildApp(_baseDraft));
      await tester.pumpAndSettle();

      await tester.tap(find.byType(CheckboxListTile));
      await tester.pumpAndSettle();

      final button = tester.widget<FilledButton>(
        find.byKey(const Key('review-submit')),
      );
      expect(button.onPressed, isNotNull);
    });

    testWidgets('successful submit navigates to success screen', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(800, 1800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final confirmedDraft = _baseDraft.copyWith(falseStatementConfirmed: true);
      await tester.pumpWidget(
        _buildApp(confirmedDraft, repo: _fakeRepo(referenceCode: 'BLG-XYZ')),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('review-submit')));
      await tester.pumpAndSettle();

      expect(find.text('berhasil'), findsOneWidget);
    });

    testWidgets('failed submit queues request and shows offline snackbar', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(800, 1800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final confirmedDraft = _baseDraft.copyWith(falseStatementConfirmed: true);
      final queue = MemorySubmissionQueueService(DioClient());
      await tester.pumpWidget(
        _buildApp(confirmedDraft, repo: _fakeRepo(fail: true), queue: queue),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('review-submit')));
      await tester.pumpAndSettle();

      expect(
        find.text(
          'Koneksi bermasalah. Permohonan disimpan offline dan akan dikirim otomatis.',
        ),
        findsOneWidget,
      );
      expect(queue.pending(), hasLength(1));
      expect(queue.pending().single.path, '/requests');
    });
  });
}
