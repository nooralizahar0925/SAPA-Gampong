import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/core/theme/app_theme.dart';

void main() {
  testWidgets('primary button colors remain readable on the green shell', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Column(
            children: [
              FilledButton(onPressed: () {}, child: const Text('Aktif')),
              const FilledButton(onPressed: null, child: Text('Nonaktif')),
            ],
          ),
        ),
      ),
    );

    final context = tester.element(find.text('Aktif'));
    final style = FilledButtonTheme.of(context).style!;

    expect(style.backgroundColor?.resolve({}), AppTheme.gold500);
    expect(style.foregroundColor?.resolve({}), AppTheme.ink900);
    expect(
      style.backgroundColor?.resolve({WidgetState.disabled}),
      AppTheme.g700,
    );
    expect(
      style.foregroundColor?.resolve({WidgetState.disabled}),
      AppTheme.g200,
    );
  });
}
