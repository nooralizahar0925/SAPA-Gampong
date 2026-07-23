import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sapa_gampong/core/router/app_router.dart';
import 'package:sapa_gampong/core/theme/app_theme.dart';
import 'package:sapa_gampong/core/network/dio_client.dart';
import 'package:sapa_gampong/data/models/attachment.dart';
import 'package:sapa_gampong/data/models/field_spec.dart';
import 'package:sapa_gampong/data/models/letter_request.dart';
import 'package:sapa_gampong/data/models/letter_type.dart';
import 'package:sapa_gampong/data/providers/content_providers.dart';
import 'package:sapa_gampong/data/providers/letter_providers.dart';
import 'package:sapa_gampong/data/providers/resident_providers.dart';
import 'package:sapa_gampong/data/repositories/letter_repository.dart';
import 'package:sapa_gampong/data/services/attachment_file_picker_service.dart';
import 'package:sapa_gampong/data/services/upload_service.dart';
import 'package:sapa_gampong/features/home/home_screen.dart';
import 'package:sapa_gampong/features/letters/attachment_screen.dart';
import 'package:sapa_gampong/features/letters/letter_catalog_screen.dart';
import 'package:sapa_gampong/features/letters/letter_form_screen.dart';
import 'package:sapa_gampong/features/letters/purpose_screen.dart';
import 'package:sapa_gampong/features/letters/review_screen.dart';
import 'package:sapa_gampong/features/letters/success_screen.dart';

import 'resident_test_support.dart';

class FakeLetterRepository extends LetterRepository {
  FakeLetterRepository() : super(DioClient());

  LetterRequestDraft? submittedDraft;

  @override
  Future<List<LetterType>> letterTypes() async => [l1Type];

  @override
  Future<CreatedRequest> submit(LetterRequestDraft draft) async {
    submittedDraft = draft;
    return const CreatedRequest(
      id: 'req-1',
      referenceCode: 'BLG-E2E1',
      status: 'pending',
    );
  }
}

class FakeUploadService extends UploadService {
  FakeUploadService() : super(DioClient());

  final uploadedKinds = <String>[];

  @override
  Future<Attachment> upload(PickedAttachmentFile file, String kind) async {
    uploadedKinds.add(kind);
    return Attachment(fileId: 'file-$kind', kind: kind);
  }
}

class FakeAttachmentPicker extends AttachmentFilePickerService {
  FakeAttachmentPicker(this.file) : super();

  final PickedAttachmentFile file;

  @override
  Future<PickedAttachmentFile?> pick(AttachmentPickSource source) async => file;
}

const l1Type = LetterType(
  code: 'L1',
  name: 'Surat Keterangan Berdomisili',
  description: 'Keterangan tempat tinggal warga.',
  subjectIsApplicant: true,
  requiredAttachments: ['KTP', 'KK'],
  fields: [
    FieldSpec(key: 'nik', label: 'NIK', type: FieldType.nik, required: true),
    FieldSpec(
      key: 'nama',
      label: 'Nama Lengkap',
      type: FieldType.text,
      required: true,
    ),
    FieldSpec(
      key: 'alamat',
      label: 'Alamat',
      type: FieldType.textarea,
      required: true,
    ),
  ],
);

Future<void> runLetterFlow(WidgetTester tester) async {
  tester.view.physicalSize = const Size(800, 4000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final tempFile = await File(
    '${Directory.systemTemp.path}/sapa-letter-flow-upload.pdf',
  ).writeAsBytes(List<int>.filled(128, 1));
  addTearDown(() {
    if (tempFile.existsSync()) tempFile.deleteSync();
  });
  final pickedFile = PickedAttachmentFile(
    name: 'sapa-letter-flow-upload.pdf',
    sizeBytes: tempFile.lengthSync(),
    path: tempFile.path,
  );

  final letterRepository = FakeLetterRepository();
  final uploadService = FakeUploadService();
  final residentService = await residentSessionService();

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        bannersProvider.overrideWith((_) async => const []),
        letterRepositoryProvider.overrideWithValue(letterRepository),
        uploadServiceProvider.overrideWithValue(uploadService),
        residentSessionServiceProvider.overrideWithValue(residentService),
        attachmentFilePickerProvider.overrideWithValue(
          FakeAttachmentPicker(pickedFile),
        ),
      ],
      child: const _LetterFlowTestApp(),
    ),
  );

  await pumpUi(tester);

  await tester.tap(find.byKey(const Key('home-letter-request')));
  await pumpUi(tester);

  expect(find.text('Pilih jenis surat'), findsOneWidget);
  await tester.tap(find.byKey(const Key('letter-type-L1')));
  await pumpUi(tester);

  await tester.enterText(
    find.widgetWithText(TextFormField, 'Nama Pemohon'),
    'Budi Santoso',
  );
  expect(find.text(testResidentSession.email), findsOneWidget);
  await tester.enterText(
    find.widgetWithText(TextFormField, 'No. HP'),
    '081234567890',
  );
  await tester.enterText(
    find.byKey(const Key('field-nik')),
    '1107010101010001',
  );
  await tester.enterText(find.byKey(const Key('field-nama')), 'Budi Santoso');
  await tester.enterText(
    find.byKey(const Key('field-alamat')),
    'Dusun Meunasah, Gampong Blang',
  );

  await tester.tap(find.byKey(const Key('letter-form-next')));
  await pumpUi(tester);

  expect(find.text('Tujuan Surat'), findsOneWidget);
  await tester.tap(find.text('Bantuan Sosial'));
  await pumpUi(tester);
  await tester.tap(find.widgetWithText(FilledButton, 'Selanjutnya'));
  await pumpUi(tester);

  expect(find.text('Unggah lampiran'), findsOneWidget);
  await uploadAttachment(tester, 'KTP');
  await uploadAttachment(tester, 'KK');
  await tester.tap(find.byKey(const Key('attachments-next')));
  await pumpUi(tester);

  expect(find.text('Periksa permohonan'), findsOneWidget);
  await tester.tap(find.byType(CheckboxListTile));
  await pumpUi(tester);
  await tester.tap(find.byKey(const Key('review-submit')));
  await pumpUi(tester);

  expect(find.text('Permohonan telah dikirim'), findsOneWidget);
  expect(find.text('BLG-E2E1'), findsOneWidget);
  expect(uploadService.uploadedKinds, ['KTP', 'KK']);
  expect(letterRepository.submittedDraft?.letterType, 'L1');
  expect(letterRepository.submittedDraft?.attachments.length, 2);
}

Future<void> uploadAttachment(WidgetTester tester, String kind) async {
  await tester.tap(find.byKey(Key('attachment-$kind')));
  await pumpUi(tester);
  await tester.tap(find.text('PDF'));
  await pumpUi(tester);
  expect(find.text('$kind terunggah'), findsOneWidget);
}

Future<void> pumpUi(
  WidgetTester tester, [
  Duration duration = const Duration(milliseconds: 500),
]) async {
  await tester.pump();
  await tester.pump(duration);
}

class _LetterFlowTestApp extends StatelessWidget {
  const _LetterFlowTestApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Gampong Blang Digital',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            name: AppRouteNames.home,
            builder: (_, _) => const HomeScreen(),
          ),
          GoRoute(
            path: '/layanan/surat',
            name: AppRouteNames.letterCatalog,
            builder: (_, _) => const LetterCatalogScreen(),
          ),
          GoRoute(
            path: '/layanan/surat/form',
            name: AppRouteNames.letterForm,
            builder: (_, state) {
              final extra = state.extra;
              return LetterFormScreen(
                letterType: extra is LetterType ? extra : l1Type,
              );
            },
          ),
          GoRoute(
            path: '/layanan/surat/tujuan',
            name: AppRouteNames.purpose,
            builder: (_, state) =>
                PurposeScreen(flowDraft: state.extra as LetterFlowDraft),
          ),
          GoRoute(
            path: '/layanan/surat/lampiran',
            name: AppRouteNames.attachments,
            builder: (_, state) =>
                AttachmentScreen(flowDraft: state.extra as LetterFlowDraft),
          ),
          GoRoute(
            path: '/layanan/surat/ringkasan',
            name: AppRouteNames.review,
            builder: (_, state) =>
                ReviewScreen(flowDraft: state.extra as LetterFlowDraft),
          ),
          GoRoute(
            path: '/layanan/surat/berhasil',
            name: AppRouteNames.success,
            builder: (_, state) =>
                SuccessScreen(flowDraft: state.extra as LetterFlowDraft),
          ),
        ],
      ),
    );
  }
}
