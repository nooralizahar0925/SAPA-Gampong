import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sapa_gampong/data/mock/letter_seed.dart';
import 'package:sapa_gampong/data/providers/content_providers.dart';
import 'package:sapa_gampong/data/providers/letter_providers.dart';
import 'package:sapa_gampong/data/providers/resident_providers.dart';
import 'package:sapa_gampong/features/home/home_screen.dart';

import 'support/resident_test_support.dart';

void main() {
  testWidgets('app boots to Beranda', (tester) async {
    final residentService = await residentSessionService(verified: false);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          bannersProvider.overrideWith((_) async => const []),
          letterTypesProvider.overrideWith((_) async => sampleLetterTypes),
          residentSessionServiceProvider.overrideWithValue(residentService),
          residentRequestsProvider.overrideWith((_) async => const []),
          residentFeedbackProvider.overrideWith((_) async => const []),
        ],
        child: const MaterialApp(home: HomeScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Beranda'), findsOneWidget);
    expect(find.byKey(const Key('home-letter-request')), findsOneWidget);
  });
}
