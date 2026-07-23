import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sapa_gampong/data/models/attachment.dart';
import 'package:sapa_gampong/data/models/letter_type.dart';
import 'package:sapa_gampong/features/letters/attachment_screen.dart';
import 'package:sapa_gampong/features/letters/letter_form_screen.dart';

const _type = LetterType(
  code: 'L1',
  name: 'Surat Keterangan Berdomisili',
  description: '',
  subjectIsApplicant: true,
  requiredAttachments: ['KTP', 'KK'],
  fields: [],
);

LetterFlowDraft _draft({
  LetterType letterType = _type,
  List<Attachment> attachments = const [],
}) => LetterFlowDraft(
  letterType: letterType,
  applicantName: 'Budi',
  applicantEmail: 'budi@test.com',
  applicantPhone: '081234567890',
  subjectData: {},
  attachments: attachments,
);

GoRouter _makeRouter(LetterFlowDraft draft) => GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (_, __) => AttachmentScreen(flowDraft: draft),
    ),
    GoRoute(
      path: '/layanan/surat/ringkasan',
      name: 'review',
      builder: (_, __) => const Scaffold(body: Text('ringkasan')),
    ),
  ],
);

void main() {
  group('AttachmentScreen', () {
    testWidgets('renders a tile for each required attachment kind', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp.router(routerConfig: _makeRouter(_draft())),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('attachment-KTP')), findsOneWidget);
      expect(find.byKey(const Key('attachment-KK')), findsOneWidget);
    });

    testWidgets('Next button is disabled when no uploads done', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp.router(routerConfig: _makeRouter(_draft())),
        ),
      );
      await tester.pumpAndSettle();

      final button = tester.widget<FilledButton>(
        find.byKey(const Key('attachments-next')),
      );
      expect(button.onPressed, isNull);
    });

    testWidgets('Next button is enabled when all attachments are pre-loaded', (
      tester,
    ) async {
      final draft = _draft(
        attachments: [
          const Attachment(fileId: 'f1', kind: 'KTP'),
          const Attachment(fileId: 'f2', kind: 'KK'),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp.router(routerConfig: _makeRouter(draft)),
        ),
      );
      await tester.pumpAndSettle();

      final button = tester.widget<FilledButton>(
        find.byKey(const Key('attachments-next')),
      );
      expect(button.onPressed, isNotNull);
    });

    testWidgets('tapping Next navigates to review screen', (tester) async {
      final draft = _draft(
        attachments: [
          const Attachment(fileId: 'f1', kind: 'KTP'),
          const Attachment(fileId: 'f2', kind: 'KK'),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp.router(routerConfig: _makeRouter(draft)),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('attachments-next')));
      await tester.pumpAndSettle();

      expect(find.text('ringkasan'), findsOneWidget);
    });

    testWidgets('pre-loaded tiles show checkmark icon', (tester) async {
      final draft = _draft(
        attachments: [const Attachment(fileId: 'f1', kind: 'KTP')],
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp.router(routerConfig: _makeRouter(draft)),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.check_circle), findsOneWidget);
      expect(find.byIcon(Icons.upload_file_outlined), findsOneWidget);
    });

    testWidgets('optional attachment slots do not block the next step', (
      tester,
    ) async {
      final draft = _draft(
        letterType: _type.copyWith(requiredAttachments: ['KTP']),
        attachments: [const Attachment(fileId: 'f1', kind: 'KTP')],
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp.router(routerConfig: _makeRouter(draft)),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('attachment-KK')), findsOneWidget);
      expect(find.text('Opsional, unggah bila tersedia'), findsOneWidget);

      final button = tester.widget<FilledButton>(
        find.byKey(const Key('attachments-next')),
      );
      expect(button.onPressed, isNotNull);
    });
  });
}
