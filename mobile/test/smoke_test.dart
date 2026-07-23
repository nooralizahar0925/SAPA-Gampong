import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/app.dart';
import 'package:sapa_gampong/data/providers/content_providers.dart';

void main() {
  testWidgets('app boots to Beranda', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [bannersProvider.overrideWith((ref) async => [])],
        child: const App(),
      ),
    );
    await tester.pump(const Duration(milliseconds: 2100));
    await tester.pump();

    expect(find.text('Beranda'), findsOneWidget);
  });
}
