import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/app.dart';

void main() {
  testWidgets('profile screen renders brief seed content', (tester) async {
    await pumpApp(tester);

    await scrollTo(tester, find.byKey(const Key('home-profile')));
    await tester.tap(find.byKey(const Key('home-profile')));
    await tester.pumpAndSettle();

    expect(find.text('Tentang Desa'), findsOneWidget);
    expect(find.text('Sofian'), findsWidgets);
    await scrollTo(tester, find.text('Afzalul Zikri'));
    expect(find.text('Afzalul Zikri'), findsWidgets);
  });

  testWidgets('demographics screen renders real RPJM numbers', (tester) async {
    await pumpApp(tester);

    await scrollTo(tester, find.byKey(const Key('home-demographics')));
    await tester.tap(find.byKey(const Key('home-demographics')));
    await tester.pumpAndSettle();

    expect(find.text('Jumlah Penduduk'), findsOneWidget);
    expect(find.text('1517'), findsOneWidget);
    expect(find.text('445'), findsOneWidget);
  });

  testWidgets('services screen links to tracking and verification', (
    tester,
  ) async {
    await pumpApp(tester);

    await tester.tap(find.byIcon(Icons.grid_view_outlined));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('service-tracking')));
    await tester.pumpAndSettle();
    expect(find.text('Riwayat Status'), findsOneWidget);

    await tester.tap(find.byTooltip('Kembali'));
    await tester.pumpAndSettle();
    await scrollTo(tester, find.byKey(const Key('service-verify')));
    await tester.tap(find.byKey(const Key('service-verify')));
    await tester.pumpAndSettle();
    expect(find.textContaining('Surat TERVERIFIKASI'), findsOneWidget);
  });

  testWidgets('back arrow returns from profile to home', (tester) async {
    await pumpApp(tester);

    await scrollTo(tester, find.byKey(const Key('home-profile')));
    await tester.tap(find.byKey(const Key('home-profile')));
    await tester.pumpAndSettle();
    expect(find.text('Tentang Desa'), findsOneWidget);

    await tester.tap(find.byTooltip('Kembali'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('home-letter-request')), findsOneWidget);
  });

  testWidgets('prayer screen renders fallback schedule and gps action', (
    tester,
  ) async {
    await pumpApp(tester);

    await scrollTo(tester, find.byKey(const Key('home-prayer')));
    await tester.tap(find.byKey(const Key('home-prayer')));
    await tester.pumpAndSettle();

    expect(find.text('Jadwal Sholat'), findsOneWidget);
    expect(find.text('Data contoh Gampong Blang'), findsOneWidget);
    expect(find.byKey(const Key('prayer-use-gps')), findsOneWidget);
    expect(find.textContaining('Subuh'), findsWidgets);
    expect(find.text('04:58 WIB'), findsOneWidget);
  });
}

Future<void> scrollTo(WidgetTester tester, Finder target) {
  return tester.scrollUntilVisible(
    target,
    300,
    scrollable: find.byType(Scrollable).first,
  );
}

Future<void> pumpApp(WidgetTester tester) async {
  tester.view.physicalSize = const Size(430, 980);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(const ProviderScope(child: App()));
  await tester.pumpAndSettle();
}
