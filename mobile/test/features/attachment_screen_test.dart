import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sapa_gampong/core/network/dio_client.dart';
import 'package:sapa_gampong/data/models/attachment.dart';
import 'package:sapa_gampong/data/models/letter_type.dart';
import 'package:sapa_gampong/data/providers/letter_providers.dart';
import 'package:sapa_gampong/data/services/attachment_file_picker_service.dart';
import 'package:sapa_gampong/data/services/upload_service.dart';
import 'package:sapa_gampong/features/letters/attachment_screen.dart';
import 'package:sapa_gampong/features/letters/letter_form_screen.dart';

const _type = LetterType(
  code: 'L1',
  name: 'Surat Keterangan Berdomisili',
  description: '',
  subjectIsApplicant: true,
  requiredAttachments: ['KTP'],
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

GoRouter _makeRouter(
  LetterFlowDraft draft, {
  ValueChanged<LetterFlowDraft>? onReview,
}) => GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (_, _) => AttachmentScreen(flowDraft: draft),
    ),
    GoRoute(
      path: '/layanan/surat/ringkasan',
      name: 'review',
      builder: (_, state) {
        final extra = state.extra;
        if (extra is LetterFlowDraft) onReview?.call(extra);
        return const Scaffold(body: Text('ringkasan'));
      },
    ),
  ],
);

class _FakeAttachmentPicker extends AttachmentFilePickerService {
  _FakeAttachmentPicker() : super();

  @override
  Future<PickedAttachmentFile?> pick(AttachmentPickSource source) async {
    return PickedAttachmentFile(
      name: 'ktp-baru.pdf',
      sizeBytes: 2048,
      bytes: Uint8List.fromList([1, 2, 3]),
      mimeType: 'application/pdf',
    );
  }
}

class _FakeUploadService extends UploadService {
  _FakeUploadService() : super(DioClient());

  final uploadedKinds = <String>[];

  @override
  Future<Attachment> upload(PickedAttachmentFile file, String kind) async {
    uploadedKinds.add(kind);
    return Attachment(fileId: 'new-${uploadedKinds.length}', kind: kind);
  }
}

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
      expect(find.byKey(const Key('attachment-KK')), findsNothing);
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
        attachments: [const Attachment(fileId: 'f1', kind: 'KTP')],
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
        attachments: [const Attachment(fileId: 'f1', kind: 'KTP')],
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
      expect(find.byIcon(Icons.upload_file_outlined), findsNothing);
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

      expect(find.byKey(const Key('attachment-KK')), findsNothing);
      expect(find.text('Opsional, unggah bila tersedia'), findsNothing);

      final button = tester.widget<FilledButton>(
        find.byKey(const Key('attachments-next')),
      );
      expect(button.onPressed, isNotNull);
    });

    testWidgets('uploaded attachment tile can be tapped to reupload', (
      tester,
    ) async {
      final uploadService = _FakeUploadService();
      LetterFlowDraft? reviewDraft;
      final draft = _draft(
        attachments: [const Attachment(fileId: 'old-ktp', kind: 'KTP')],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            attachmentFilePickerProvider.overrideWithValue(
              _FakeAttachmentPicker(),
            ),
            uploadServiceProvider.overrideWithValue(uploadService),
          ],
          child: MaterialApp.router(
            routerConfig: _makeRouter(
              draft,
              onReview: (value) => reviewDraft = value,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Ketuk untuk ganti berkas'), findsOneWidget);

      await tester.tap(find.byKey(const Key('attachment-KTP')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('PDF'));
      await tester.pumpAndSettle();

      expect(uploadService.uploadedKinds, ['KTP']);
      expect(find.text('2.0 KB · terunggah'), findsOneWidget);

      await tester.tap(find.byKey(const Key('attachments-next')));
      await tester.pumpAndSettle();

      expect(find.text('ringkasan'), findsOneWidget);
      expect(
        reviewDraft?.attachments
            .where((item) => item.kind == 'KTP')
            .single
            .fileId,
        'new-1',
      );
      expect(
        reviewDraft?.attachments.where((item) => item.kind == 'KK'),
        isEmpty,
      );
    });
  });
}
