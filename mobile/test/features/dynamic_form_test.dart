import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sapa_gampong/data/models/field_spec.dart';
import 'package:sapa_gampong/data/models/letter_type.dart';
import 'package:sapa_gampong/data/providers/resident_providers.dart';
import 'package:sapa_gampong/features/letters/letter_form_screen.dart';

import '../support/resident_test_support.dart';

// Minimal type — 2 fields, all fit on screen without scrolling.
const _basicType = LetterType(
  code: 'L1',
  name: 'Surat Keterangan Berdomisili',
  description: 'Keterangan domisili.',
  subjectIsApplicant: true,
  requiredAttachments: ['KTP'],
  fields: [
    FieldSpec(
      key: 'nama',
      label: 'Nama Lengkap',
      type: FieldType.text,
      required: true,
    ),
    FieldSpec(
      key: 'jenis_kelamin',
      label: 'Jenis Kelamin',
      type: FieldType.enumT,
      required: true,
      options: ['Laki-laki', 'Perempuan'],
    ),
  ],
);

// One NIK field — Next button stays on screen.
const _nikType = LetterType(
  code: 'L2',
  name: 'Surat NIK',
  description: '',
  subjectIsApplicant: true,
  requiredAttachments: [],
  fields: [
    FieldSpec(key: 'nik', label: 'NIK', type: FieldType.nik, required: true),
  ],
);

// One date field.
const _dateType = LetterType(
  code: 'L3',
  name: 'Surat Tanggal',
  description: '',
  subjectIsApplicant: true,
  requiredAttachments: [],
  fields: [
    FieldSpec(
      key: 'tgl_lahir',
      label: 'Tanggal Lahir',
      type: FieldType.date,
      required: true,
    ),
  ],
);

GoRouter _makeRouter(LetterType type) => GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (_, __) => LetterFormScreen(letterType: type),
    ),
    GoRoute(
      path: '/layanan/surat/tujuan',
      name: 'purpose',
      builder: (_, __) => const Scaffold(body: Text('tujuan')),
    ),
  ],
);

void main() {
  group('LetterFormScreen — dynamic form engine', () {
    Future<Widget> buildApp(LetterType type) async {
      final residentService = await residentSessionService();
      return ProviderScope(
        overrides: [
          residentSessionServiceProvider.overrideWithValue(residentService),
        ],
        child: MaterialApp.router(routerConfig: _makeRouter(type)),
      );
    }

    testWidgets('renders applicant block for every letter type', (
      tester,
    ) async {
      await tester.pumpWidget(await buildApp(_basicType));
      await tester.pumpAndSettle();

      expect(find.text('Data Pemohon'), findsOneWidget);
      expect(
        find.widgetWithText(TextFormField, 'Nama Pemohon'),
        findsOneWidget,
      );
      expect(find.text('Alamat Email'), findsOneWidget);
      expect(find.text(testResidentSession.email), findsOneWidget);
      expect(find.widgetWithText(TextFormField, 'No. HP'), findsOneWidget);
    });

    testWidgets(
      'renders separate subject fields when subject differs from applicant',
      (tester) async {
        await tester.pumpWidget(
          await buildApp(_basicType.copyWith(subjectIsApplicant: false)),
        );
        await tester.pumpAndSettle();

        expect(find.byKey(const Key('field-nama')), findsOneWidget);
        expect(find.byKey(const Key('field-jenis_kelamin')), findsOneWidget);
      },
    );

    testWidgets(
      'hides applicant-derived subject fields when subject is applicant',
      (tester) async {
        await tester.pumpWidget(await buildApp(_basicType));
        await tester.pumpAndSettle();

        expect(find.byKey(const Key('field-nama')), findsNothing);
        expect(find.byKey(const Key('field-jenis_kelamin')), findsOneWidget);
      },
    );

    testWidgets(
      'shows subject name field for office letter when subject differs',
      (tester) async {
        const l2 = LetterType(
          code: 'L2',
          name: 'Surat Keterangan Domisili Kantor',
          description: 'Untuk kantor.',
          subjectIsApplicant: false,
          requiredAttachments: [],
          fields: [
            FieldSpec(
              key: 'nama_pemohon',
              label: 'Nama Subjek Surat',
              type: FieldType.text,
              required: true,
            ),
            FieldSpec(
              key: 'nama_kantor',
              label: 'Nama Kantor',
              type: FieldType.text,
              required: true,
            ),
          ],
        );

        await tester.pumpWidget(await buildApp(l2));
        await tester.pumpAndSettle();

        expect(find.byKey(const Key('field-nama_pemohon')), findsOneWidget);
        expect(find.byKey(const Key('field-nama_kantor')), findsOneWidget);
      },
    );

    testWidgets(
      'shows subject name field when subject differs from applicant',
      (tester) async {
        const l10 = LetterType(
          code: 'L10',
          name: 'Surat Rekomendasi',
          description: 'Rekomendasi.',
          subjectIsApplicant: false,
          requiredAttachments: [],
          fields: [
            FieldSpec(
              key: 'nama_pemohon',
              label: 'Nama Subjek Surat',
              type: FieldType.text,
              required: true,
            ),
          ],
        );

        await tester.pumpWidget(await buildApp(l10));
        await tester.pumpAndSettle();

        expect(find.byKey(const Key('field-nama_pemohon')), findsOneWidget);
      },
    );

    testWidgets('hides child subject name when subject is applicant', (
      tester,
    ) async {
      const l6 = LetterType(
        code: 'L6',
        name: 'Surat Keterangan Yatim',
        description: 'Untuk anak yatim.',
        subjectIsApplicant: true,
        requiredAttachments: [],
        fields: [
          FieldSpec(
            key: 'nama_anak',
            label: 'Nama Anak',
            type: FieldType.text,
            required: true,
          ),
        ],
      );

      await tester.pumpWidget(await buildApp(l6));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('field-nama_anak')), findsNothing);
    });

    testWidgets('date field shows calendar icon', (tester) async {
      await tester.pumpWidget(await buildApp(_dateType));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('field-tgl_lahir')), findsOneWidget);
      expect(find.byIcon(Icons.calendar_today_outlined), findsOneWidget);
    });

    testWidgets('NIK field rejects value shorter than 16 digits', (
      tester,
    ) async {
      await tester.pumpWidget(await buildApp(_nikType));
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('field-nik')), '12345');
      await tester.tap(find.byKey(const Key('letter-form-next')));
      await tester.pumpAndSettle();

      expect(find.text('NIK harus 16 digit'), findsOneWidget);
    });

    testWidgets('shows subject-differs notice when subjectIsApplicant is false', (
      tester,
    ) async {
      const l6 = LetterType(
        code: 'L6',
        name: 'Surat Keterangan Yatim',
        description: 'Untuk anak yatim.',
        subjectIsApplicant: false,
        requiredAttachments: ['KTP'],
        fields: [],
      );
      await tester.pumpWidget(await buildApp(l6));
      await tester.pumpAndSettle();

      expect(
        find.text(
          'Pemohon dapat berbeda dari orang atau kantor yang diterangkan dalam surat ini.',
        ),
        findsOneWidget,
      );
    });

    testWidgets('applicant fields start empty', (tester) async {
      await tester.pumpWidget(await buildApp(_basicType));
      await tester.pumpAndSettle();

      final nameField = tester.widget<TextFormField>(
        find.widgetWithText(TextFormField, 'Nama Pemohon'),
      );
      expect(nameField.controller?.text, isEmpty);
    });
  });
}
