import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/app.dart';

void main() {
  testWidgets('app boots to Beranda', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: App()));

    expect(find.text('Beranda'), findsOneWidget);
  });
}
