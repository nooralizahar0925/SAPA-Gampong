import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sapa_gampong/core/router/app_router.dart';
import 'package:sapa_gampong/data/models/resident_session.dart';
import 'package:sapa_gampong/data/providers/resident_providers.dart';
import 'package:sapa_gampong/features/feedback/my_feedback_screen.dart';

import '../support/resident_test_support.dart';

GoRouter _router() => GoRouter(
  initialLocation: '/laporan-saya',
  routes: [
    GoRoute(
      path: '/laporan-saya',
      name: AppRouteNames.myFeedback,
      builder: (context, state) => const MyFeedbackScreen(),
    ),
    GoRoute(
      path: '/laporan-saya/detail',
      name: AppRouteNames.myFeedbackDetail,
      builder: (context, state) =>
          MyFeedbackDetailScreen(item: state.extra! as ResidentFeedbackItem),
    ),
  ],
);

Future<Widget> _wrap(List<ResidentFeedbackItem> feedback) async {
  final residentService = await residentSessionService();
  return ProviderScope(
    overrides: [
      residentSessionServiceProvider.overrideWithValue(residentService),
      residentFeedbackProvider.overrideWith((ref) async => feedback),
    ],
    child: MaterialApp.router(routerConfig: _router()),
  );
}

void main() {
  final items = [
    ResidentFeedbackItem(
      id: 'fb-1',
      referenceCode: 'LPR-79459',
      name: 'Nurul Aini',
      email: testResidentSession.email,
      phone: '081234567890',
      body: 'Jalan rusak',
      status: 'responded',
      reply: 'Tim akan dikirim untuk survey lokasi',
      createdAt: DateTime(2026, 7, 23),
      repliedAt: DateTime(2026, 7, 24),
      attachments: const [
        ResidentFeedbackAttachment(
          fileId: 'file-1',
          kind: 'photo',
          mime: 'image/jpeg',
          size: 2048,
          originalName: 'jalan-rusak.jpg',
          url: 'https://example.test/file-1',
        ),
      ],
    ),
    ResidentFeedbackItem(
      id: 'fb-2',
      referenceCode: 'LPR-A1B2C',
      name: 'Budi',
      email: testResidentSession.email,
      body: 'Lampu mati',
      status: 'new',
      createdAt: DateTime(2026, 7, 22),
    ),
  ];

  testWidgets('searches, filters, and opens feedback detail', (tester) async {
    await tester.pumpWidget(await _wrap(items));
    await tester.pumpAndSettle();

    expect(find.text('LPR-79459'), findsOneWidget);
    expect(find.text('LPR-A1B2C'), findsOneWidget);

    await tester.enterText(
      find.byKey(const Key('feedback-search-code')),
      '79459',
    );
    await tester.pump();

    expect(find.text('LPR-79459'), findsOneWidget);
    expect(find.text('LPR-A1B2C'), findsNothing);

    await tester.tap(find.byKey(const Key('feedback-filter-responded')));
    await tester.pump();

    expect(find.text('LPR-79459'), findsOneWidget);
    expect(find.text('Dibalas'), findsAtLeastNWidgets(1));

    await tester.tap(find.text('LPR-79459'));
    await tester.pumpAndSettle();

    expect(find.text('Detail Laporan'), findsOneWidget);
    expect(find.text('Nurul Aini'), findsOneWidget);
    expect(find.text('Tim akan dikirim untuk survey lokasi'), findsOneWidget);
    expect(find.text('jalan-rusak.jpg'), findsOneWidget);
  });
}
