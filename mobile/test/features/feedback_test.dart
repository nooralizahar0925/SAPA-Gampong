import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/core/network/dio_client.dart';
import 'package:sapa_gampong/core/theme/app_theme.dart';
import 'package:sapa_gampong/data/models/attachment.dart';
import 'package:sapa_gampong/data/models/feedback_model.dart';
import 'package:sapa_gampong/data/providers/feedback_providers.dart';
import 'package:sapa_gampong/data/providers/letter_providers.dart';
import 'package:sapa_gampong/data/providers/resident_providers.dart';
import 'package:sapa_gampong/data/providers/submission_queue_providers.dart';
import 'package:sapa_gampong/data/repositories/feedback_repository.dart';
import 'package:sapa_gampong/data/services/attachment_file_picker_service.dart';
import 'package:sapa_gampong/data/services/submission_queue_service.dart';
import 'package:sapa_gampong/data/services/upload_service.dart';
import 'package:sapa_gampong/features/feedback/feedback_screen.dart';

import '../support/resident_test_support.dart';

class _FakeFeedbackRepository extends FeedbackRepository {
  _FakeFeedbackRepository({this.fail = false}) : super(DioClient());

  final bool fail;

  FeedbackDraft? submittedDraft;

  @override
  Future<FeedbackCreated> submit(FeedbackDraft draft) async {
    if (fail) throw Exception('offline');
    submittedDraft = draft;
    return const FeedbackCreated(
      id: 'fb-1',
      referenceCode: 'LPR-A1B2C',
      status: 'new',
    );
  }
}

class _FakeUploadService extends UploadService {
  _FakeUploadService() : super(DioClient());

  String? uploadedKind;

  @override
  Future<Attachment> upload(PickedAttachmentFile file, String kind) async {
    uploadedKind = kind;
    return Attachment(fileId: 'file-feedback-1', kind: kind);
  }
}

class _FakeAttachmentPicker extends AttachmentFilePickerService {
  _FakeAttachmentPicker(this.file) : super();

  final PickedAttachmentFile file;

  @override
  Future<PickedAttachmentFile?> pick(AttachmentPickSource source) async => file;
}

Future<Widget> _wrap(
  FeedbackRepository repository, {
  SubmissionQueueService? queue,
  bool verified = true,
  UploadService? uploadService,
  AttachmentFilePickerService? picker,
}) async {
  final residentService = await residentSessionService(verified: verified);
  return ProviderScope(
    overrides: [
      feedbackRepositoryProvider.overrideWithValue(repository),
      if (queue != null) submissionQueueProvider.overrideWithValue(queue),
      if (uploadService != null)
        uploadServiceProvider.overrideWithValue(uploadService),
      if (picker != null)
        attachmentFilePickerProvider.overrideWithValue(picker),
      residentSessionServiceProvider.overrideWithValue(residentService),
    ],
    child: const MaterialApp(home: FeedbackScreen()),
  );
}

void main() {
  Finder field(String key) => find.descendant(
    of: find.byKey(Key(key)),
    matching: find.byType(TextFormField),
  );

  Future<void> scrollTo(WidgetTester tester, Finder finder) async {
    await tester.scrollUntilVisible(
      finder,
      300,
      scrollable: find.byType(Scrollable).first,
    );
  }

  testWidgets('submits feedback and shows API reference code', (tester) async {
    final repository = _FakeFeedbackRepository();
    await tester.pumpWidget(await _wrap(repository));
    await tester.pumpAndSettle();

    await tester.enterText(field('feedback-name'), 'Budi Santoso');
    await tester.enterText(field('feedback-phone'), '081234567890');
    await tester.enterText(
      field('feedback-body'),
      'Lampu jalan dekat meunasah mati sejak kemarin.',
    );
    await scrollTo(tester, find.byKey(const Key('feedback-submit')));
    await tester.tap(find.byKey(const Key('feedback-submit')));
    await tester.pumpAndSettle();

    expect(
      repository.submittedDraft?.body,
      'Lampu jalan dekat meunasah mati sejak kemarin.',
    );
    expect(repository.submittedDraft?.email, testResidentSession.email);
    expect(find.text('Laporan telah dikirim'), findsOneWidget);
    expect(find.text('LPR-A1B2C'), findsOneWidget);
    expect(find.text('Lihat Laporan Saya'), findsOneWidget);

    final historyButton = tester.widget<OutlinedButton>(
      find.byKey(const Key('feedback-success-history')),
    );
    expect(historyButton.style?.foregroundColor?.resolve({}), AppTheme.gold100);
    await scrollTo(tester, find.byKey(const Key('feedback-success-home')));
    final homeButton = tester.widget<FilledButton>(
      find.byKey(const Key('feedback-success-home')),
    );
    expect(homeButton.style?.backgroundColor?.resolve({}), AppTheme.gold500);
  });

  testWidgets('phone field accepts digits only', (tester) async {
    final repository = _FakeFeedbackRepository();
    await tester.pumpWidget(await _wrap(repository));
    await tester.pumpAndSettle();

    final phoneField = field('feedback-phone');
    await tester.enterText(phoneField, '08ab12-34');

    final input = tester.widget<TextFormField>(phoneField);
    expect(input.controller?.text, '081234');
  });

  testWidgets('requires verified email before showing the form', (
    tester,
  ) async {
    final repository = _FakeFeedbackRepository();
    await tester.pumpWidget(await _wrap(repository, verified: false));
    await tester.pumpAndSettle();

    expect(find.text('Verifikasi email'), findsOneWidget);
    expect(find.byKey(const Key('feedback-submit')), findsNothing);
    expect(repository.submittedDraft, isNull);
  });

  testWidgets('failed submit queues feedback and shows offline snackbar', (
    tester,
  ) async {
    final repository = _FakeFeedbackRepository(fail: true);
    final queue = MemorySubmissionQueueService(DioClient());
    await tester.pumpWidget(await _wrap(repository, queue: queue));
    await tester.pumpAndSettle();

    await tester.enterText(field('feedback-name'), 'Budi Santoso');
    await tester.enterText(field('feedback-phone'), '081234567890');
    await tester.enterText(field('feedback-body'), 'Lampu jalan mati.');
    await scrollTo(tester, find.byKey(const Key('feedback-submit')));
    await tester.tap(find.byKey(const Key('feedback-submit')));
    await tester.pumpAndSettle();

    expect(
      find.text(
        'Koneksi bermasalah. Laporan disimpan offline dan akan dikirim otomatis.',
      ),
      findsOneWidget,
    );
    expect(queue.pending(), hasLength(1));
    expect(queue.pending().single.path, '/feedback');
  });

  testWidgets('uploads optional attachment and includes it in payload', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeFeedbackRepository();
    final uploadService = _FakeUploadService();
    final file = File('/tmp/sapa-feedback-test.pdf')
      ..writeAsBytesSync(List<int>.filled(128, 1));
    addTearDown(() {
      if (file.existsSync()) file.deleteSync();
    });
    final pickedFile = PickedAttachmentFile(
      name: 'sapa-feedback-test.pdf',
      sizeBytes: file.lengthSync(),
      path: file.path,
    );

    await tester.pumpWidget(
      await _wrap(
        repository,
        uploadService: uploadService,
        picker: _FakeAttachmentPicker(pickedFile),
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(
      find.byKey(const Key('feedback-attachment-add')),
    );
    await tester.pump();
    await tester.tap(find.byKey(const Key('feedback-attachment-add')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byKey(const Key('feedback-attachment-pdf')), findsOneWidget);
    await tester.ensureVisible(
      find.byKey(const Key('feedback-attachment-pdf')),
    );
    await tester.tap(find.byKey(const Key('feedback-attachment-pdf')));
    await tester.pumpAndSettle();

    expect(uploadService.uploadedKind, 'document');
    expect(
      find.byKey(const Key('feedback-attachment-file-feedback-1')),
      findsOneWidget,
    );

    await tester.enterText(field('feedback-name'), 'Budi Santoso');
    await tester.enterText(field('feedback-phone'), '081234567890');
    await tester.enterText(field('feedback-body'), 'Lampiran kerusakan jalan.');
    await tester.tap(find.byKey(const Key('feedback-submit')));
    await tester.pumpAndSettle();

    expect(repository.submittedDraft?.attachments, hasLength(1));
    expect(
      repository.submittedDraft?.attachments.single.fileId,
      'file-feedback-1',
    );
    expect(repository.submittedDraft?.attachments.single.kind, 'document');
  });
}
