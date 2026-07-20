import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/app.dart';

void main() {
  testWidgets('resident can complete a mock letter request flow', (
    tester,
  ) async {
    await pumpApp(tester);

    await tester.tap(find.byKey(const Key('home-letter-request')));
    await tester.pumpAndSettle();

    expect(find.text('Pilih jenis surat'), findsOneWidget);
    await tester.tap(find.byKey(const Key('letter-type-L4')));
    await tester.pumpAndSettle();

    expect(find.text('Alamat Email'), findsOneWidget);
    await scrollTo(tester, find.byKey(const Key('letter-form-next')));
    await tester.tap(find.byKey(const Key('letter-form-next')));
    await tester.pumpAndSettle();

    expect(find.text('Unggah lampiran'), findsOneWidget);
    await tester.tap(find.byKey(const Key('attachment-KTP')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('attachment-KK')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('attachments-next')));
    await tester.pumpAndSettle();

    expect(find.text('Periksa permohonan'), findsOneWidget);
    await scrollTo(tester, find.byKey(const Key('review-submit')));
    await tester.tap(find.byKey(const Key('review-submit')));
    await tester.pumpAndSettle();

    expect(find.text('Permohonan telah dikirim'), findsOneWidget);
    expect(find.text('BLG-2K7F9'), findsOneWidget);
  });

  testWidgets('letter form validates NIK before continuing', (tester) async {
    await pumpApp(tester);

    await tester.tap(find.byKey(const Key('home-letter-request')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('letter-type-L1')));
    await tester.pumpAndSettle();

    await scrollTo(tester, find.byKey(const Key('field-nik')), delta: 300);
    final nikField = find.byKey(const Key('field-nik'));
    await tester.enterText(nikField, '1607');
    await scrollTo(tester, find.byKey(const Key('letter-form-next')));
    await tester.tap(find.byKey(const Key('letter-form-next')));
    await tester.pumpAndSettle();

    expect(find.text('NIK harus 16 digit'), findsOneWidget);
  });
}

Future<void> scrollTo(
  WidgetTester tester,
  Finder target, {
  double delta = 400,
}) {
  return tester.scrollUntilVisible(
    target,
    delta,
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
