import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sapa_gampong/data/models/field_spec.dart';
import 'package:sapa_gampong/data/models/letter_type.dart';
import 'package:sapa_gampong/data/providers/letter_providers.dart';
import 'package:sapa_gampong/features/letters/letter_catalog_screen.dart';

const _twoTypes = [
  LetterType(
    code: 'L1',
    name: 'Surat Keterangan Berdomisili',
    description: 'Keterangan domisili warga.',
    subjectIsApplicant: true,
    requiredAttachments: ['KTP', 'KK'],
    fields: [
      FieldSpec(
          key: 'nama', label: 'Nama', type: FieldType.text, required: true),
    ],
  ),
  LetterType(
    code: 'L2',
    name: 'Surat Keterangan Domisili Kantor',
    description: 'Untuk kantor atau lembaga.',
    subjectIsApplicant: false,
    requiredAttachments: ['KTP'],
    fields: [],
  ),
];

GoRouter _makeRouter() => GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (_, __) => const LetterCatalogScreen(),
        ),
        GoRoute(
          path: '/layanan/surat/form',
          name: 'letterForm',
          builder: (_, __) => const Scaffold(body: Text('form')),
        ),
      ],
    );

void main() {
  group('LetterCatalogScreen', () {
    testWidgets('shows loading indicator while provider is pending',
        (tester) async {
      final completer = Completer<List<LetterType>>();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            letterTypesProvider.overrideWith((ref) => completer.future),
          ],
          child: MaterialApp.router(routerConfig: _makeRouter()),
        ),
      );
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      completer.complete([]);
      await tester.pumpAndSettle();
    });

    testWidgets('renders a tile for each letter type returned by provider',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            letterTypesProvider.overrideWith((ref) async => _twoTypes),
          ],
          child: MaterialApp.router(routerConfig: _makeRouter()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('letter-type-L1')), findsOneWidget);
      expect(find.byKey(const Key('letter-type-L2')), findsOneWidget);
      expect(find.text('Surat Keterangan Berdomisili'), findsOneWidget);
      expect(find.text('Surat Keterangan Domisili Kantor'), findsOneWidget);
    });

    testWidgets('shows retry button on error', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            letterTypesProvider.overrideWith(
                (ref) => Future<List<LetterType>>.error('network error')),
          ],
          child: MaterialApp.router(routerConfig: _makeRouter()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('catalog-retry')), findsOneWidget);
      expect(find.text('Gagal memuat jenis surat.'), findsOneWidget);
    });

    testWidgets('tapping a tile navigates to letter form', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            letterTypesProvider.overrideWith((ref) async => _twoTypes),
          ],
          child: MaterialApp.router(routerConfig: _makeRouter()),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('letter-type-L1')));
      await tester.pumpAndSettle();

      expect(find.text('form'), findsOneWidget);
    });
  });
}
