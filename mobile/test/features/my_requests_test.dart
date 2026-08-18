import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sapa_gampong/core/network/dio_client.dart';
import 'package:sapa_gampong/core/router/app_router.dart';
import 'package:sapa_gampong/data/models/attachment.dart';
import 'package:sapa_gampong/data/models/field_spec.dart';
import 'package:sapa_gampong/data/models/letter_type.dart';
import 'package:sapa_gampong/data/models/resident_session.dart';
import 'package:sapa_gampong/data/providers/letter_providers.dart';
import 'package:sapa_gampong/data/providers/resident_providers.dart';
import 'package:sapa_gampong/data/repositories/resident_repository.dart';
import 'package:sapa_gampong/features/letters/letter_form_screen.dart';
import 'package:sapa_gampong/features/letters/my_requests_screen.dart';

import '../support/resident_test_support.dart';

class _FakeResidentRepository extends ResidentRepository {
  _FakeResidentRepository({this.requestResponses = const []})
    : super(DioClient());

  String? canceledId;
  final List<List<ResidentRequestItem>> requestResponses;
  int requestCallCount = 0;

  @override
  Future<List<ResidentRequestItem>> requests(ResidentSession session) async {
    requestCallCount += 1;
    if (requestResponses.isEmpty) return const [];
    final index = requestCallCount - 1;
    return requestResponses[index.clamp(0, requestResponses.length - 1)];
  }

  @override
  Future<ResidentRequestItem> cancelRequest({
    required ResidentSession session,
    required String id,
  }) async {
    canceledId = id;
    return ResidentRequestItem(
      id: id,
      referenceCode: 'GB-2026-000001',
      letterType: 'L10',
      status: 'CANCELED',
      statusLabel: 'Dibatalkan',
      createdAt: DateTime(2026, 7, 23),
      updatedAt: DateTime(2026, 7, 25),
      decisionReason: 'Dibatalkan oleh warga',
    );
  }
}

Future<Widget> _wrap({
  required List<ResidentRequestItem> requests,
  _FakeResidentRepository? repository,
}) async {
  final residentService = await residentSessionService(
    session: testResidentSession,
  );
  return ProviderScope(
    overrides: [
      residentSessionServiceProvider.overrideWithValue(residentService),
      residentRequestsProvider.overrideWith((_) async => requests),
      letterTypesProvider.overrideWith((_) async => [_letterType]),
      if (repository != null)
        residentRepositoryProvider.overrideWithValue(repository),
    ],
    child: MaterialApp.router(
      routerConfig: GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            name: AppRouteNames.myRequests,
            builder: (_, state) => const MyRequestsScreen(),
          ),
          GoRoute(
            path: '/lacak',
            name: AppRouteNames.tracking,
            builder: (_, state) =>
                Scaffold(body: Text('riwayat:${state.extra}')),
          ),
          GoRoute(
            path: '/form',
            name: AppRouteNames.letterForm,
            builder: (_, state) {
              final draft = state.extra! as LetterFlowDraft;
              return Scaffold(
                body: Text(
                  'correction:${draft.requestId}:${draft.applicantName}:${draft.subjectData['nama']}:${draft.attachments.length}',
                ),
              );
            },
          ),
        ],
      ),
    ),
  );
}

Future<Widget> _wrapLiveRepository(_FakeResidentRepository repository) async {
  final residentService = await residentSessionService(
    session: testResidentSession,
  );
  return ProviderScope(
    overrides: [
      residentSessionServiceProvider.overrideWithValue(residentService),
      residentRepositoryProvider.overrideWithValue(repository),
      letterTypesProvider.overrideWith((_) async => [_letterType]),
    ],
    child: MaterialApp.router(
      routerConfig: GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            name: AppRouteNames.myRequests,
            builder: (_, state) => const MyRequestsScreen(),
          ),
        ],
      ),
    ),
  );
}

const _letterType = LetterType(
  code: 'L10',
  name: 'Surat Rekomendasi',
  description: 'Rekomendasi resmi.',
  subjectIsApplicant: false,
  requiredAttachments: ['KTP'],
  fields: [
    FieldSpec(key: 'nama', label: 'Nama', type: FieldType.text, required: true),
  ],
);

void main() {
  final submitted = ResidentRequestItem(
    id: 'req-1',
    referenceCode: 'GB-2026-000001',
    letterType: 'L10',
    status: 'SUBMITTED',
    statusLabel: 'Diajukan',
    createdAt: DateTime(2026, 7, 23),
    updatedAt: DateTime(2026, 7, 23),
  );

  testWidgets('request card opens tracking history and badge sits above code', (
    tester,
  ) async {
    await tester.pumpWidget(await _wrap(requests: [submitted]));
    await tester.pumpAndSettle();

    final badgeTop = tester.getTopLeft(find.text('Diajukan')).dy;
    final codeTop = tester
        .getTopLeft(find.byKey(const Key('request-card-code-GB-2026-000001')))
        .dy;
    expect(badgeTop, lessThan(codeTop));

    await tester.tap(find.byKey(const Key('request-card-code-GB-2026-000001')));
    await tester.pumpAndSettle();

    expect(find.text('riwayat:GB-2026-000001'), findsOneWidget);
  });

  testWidgets('submitted request can be cancelled from resident history', (
    tester,
  ) async {
    final repository = _FakeResidentRepository();
    await tester.pumpWidget(
      await _wrap(requests: [submitted], repository: repository),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('request-cancel-req-1')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Batalkan').last);
    await tester.pumpAndSettle();

    expect(repository.canceledId, 'req-1');
    expect(find.text('Permohonan telah dibatalkan.'), findsOneWidget);
  });

  testWidgets('refreshes stale request status when app resumes', (
    tester,
  ) async {
    final staleNeedsInfo = ResidentRequestItem(
      id: 'req-4',
      referenceCode: 'GB-2026-000004',
      letterType: 'L10',
      status: 'NEEDS_INFO',
      statusLabel: 'Perlu Perbaikan',
      createdAt: DateTime(2026, 7, 23),
      updatedAt: DateTime(2026, 7, 24),
    );
    final liveRejected = ResidentRequestItem(
      id: 'req-4',
      referenceCode: 'GB-2026-000004',
      letterType: 'L10',
      status: 'REJECTED',
      statusLabel: 'Ditolak',
      createdAt: DateTime(2026, 7, 23),
      updatedAt: DateTime(2026, 7, 25),
      decisionReason: 'Data tidak sesuai.',
    );
    final repository = _FakeResidentRepository(
      requestResponses: [
        [staleNeedsInfo],
        [liveRejected],
      ],
    );

    await tester.pumpWidget(await _wrapLiveRepository(repository));
    await tester.pumpAndSettle();

    expect(repository.requestCallCount, 1);
    expect(find.text('Perlu Perbaikan'), findsOneWidget);

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();

    expect(repository.requestCallCount, greaterThanOrEqualTo(2));
    expect(find.text('Ditolak'), findsOneWidget);
    expect(find.text('Perlu Perbaikan'), findsNothing);
  });

  testWidgets('request after review does not show cancel action', (
    tester,
  ) async {
    await tester.pumpWidget(
      await _wrap(
        requests: [
          ResidentRequestItem(
            id: 'req-2',
            referenceCode: 'GB-2026-000002',
            letterType: 'L10',
            status: 'IN_REVIEW',
            statusLabel: 'Sedang Ditinjau',
            createdAt: DateTime(2026, 7, 23),
            updatedAt: DateTime(2026, 7, 24),
          ),
        ],
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Batalkan'), findsNothing);
  });

  testWidgets('request needing info can open prefilled correction flow', (
    tester,
  ) async {
    await tester.pumpWidget(
      await _wrap(
        requests: [
          ResidentRequestItem(
            id: 'req-3',
            referenceCode: 'GB-2026-000003',
            letterType: 'L10',
            status: 'NEEDS_INFO',
            statusLabel: 'Perlu Perbaikan',
            applicantName: 'Nurul',
            applicantEmail: testResidentSession.email,
            applicantPhone: '081234567890',
            subjectData: const {'nama': 'Aisyah'},
            attachments: const [Attachment(fileId: 'ktp-file', kind: 'KTP')],
            createdAt: DateTime(2026, 7, 23),
            updatedAt: DateTime(2026, 7, 24),
            decisionReason: 'Perbaiki Attachment KTP dan KK',
          ),
        ],
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('request-correct-req-3')));
    await tester.pumpAndSettle();

    expect(find.text('correction:req-3:Nurul:Aisyah:1'), findsOneWidget);
  });
}
