import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sapa_gampong/data/models/demographic_block.dart';
import 'package:sapa_gampong/data/providers/content_providers.dart';
import 'package:sapa_gampong/features/demographics/demographics_screen.dart';

GoRouter _makeRouter() => GoRouter(
  initialLocation: '/',
  routes: [GoRoute(path: '/', builder: (_, __) => const DemographicsScreen())],
);

Widget _buildApp(List<DemographicBlock> blocks) => ProviderScope(
  overrides: [demographicsProvider.overrideWith((_) async => blocks)],
  child: MaterialApp.router(routerConfig: _makeRouter()),
);

final _numberBlock = DemographicBlock(
  key: 'jumlah_penduduk',
  label: 'Jumlah Penduduk',
  type: 'number',
  rawData: const {'value': 1517},
);

// Fixed block — still uses legacy map format (keys preserved by dashboard).
final _splitBlock = DemographicBlock(
  key: 'jenis_kelamin',
  label: 'Jenis Kelamin',
  type: 'split',
  rawData: const {'laki_laki': 777, 'perempuan': 740},
);

// Non-fixed blocks use the new ordered-array format.
final _barBlock = DemographicBlock(
  key: 'tingkat_pendidikan',
  label: 'Tingkat Pendidikan',
  type: 'bar',
  rawData: const [
    {'label': 'SD', 'value': 412},
    {'label': 'SMP', 'value': 336},
    {'label': 'SMA', 'value': 498},
  ],
);

final _pieBlock = DemographicBlock(
  key: 'mata_pencaharian',
  label: 'Mata Pencaharian',
  type: 'pie',
  rawData: const [
    {'label': 'Petani', 'value': 486},
    {'label': 'Nelayan', 'value': 312},
  ],
);

final _hiddenBlock = DemographicBlock(
  key: 'distribusi_umur',
  label: 'Distribusi Umur',
  type: 'bar',
  rawData: const [
    {'label': 'SD', 'value': 10},
  ],
  visible: false,
);

void main() {
  testWidgets('shows backend loading state without seed labels', (
    tester,
  ) async {
    final completer = Completer<List<DemographicBlock>>();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [demographicsProvider.overrideWith((_) => completer.future)],
        child: MaterialApp.router(routerConfig: _makeRouter()),
      ),
    );
    expect(find.byKey(const Key('demo-loading-state')), findsOneWidget);
    expect(find.text('SLTP'), findsNothing);
    expect(find.text('SLTA'), findsNothing);
    expect(find.text('D1–D3'), findsNothing);
    expect(find.text('S-1'), findsNothing);
    completer.complete([]);
  });

  testWidgets('number block shows value and label', (tester) async {
    await tester.pumpWidget(_buildApp([_numberBlock]));
    await tester.pump();

    expect(find.text('Jumlah Penduduk'), findsOneWidget);
    expect(
      find.byKey(const Key('demo-number-jumlah_penduduk')),
      findsOneWidget,
    );
    expect(find.text('1517'), findsOneWidget);
  });

  testWidgets('split block shows donut chart widget', (tester) async {
    await tester.pumpWidget(_buildApp([_splitBlock]));
    await tester.pump();

    expect(find.text('Jenis Kelamin'), findsOneWidget);
    expect(find.byKey(const Key('demo-split-jenis_kelamin')), findsOneWidget);
    // Humanized labels appear in legend.
    expect(find.text('Laki-laki'), findsOneWidget);
    expect(find.text('Perempuan'), findsOneWidget);
  });

  testWidgets('bar block shows bar chart widget', (tester) async {
    await tester.pumpWidget(_buildApp([_barBlock]));
    await tester.pump();

    expect(find.text('Tingkat Pendidikan'), findsOneWidget);
    expect(
      find.byKey(const Key('demo-bar-tingkat_pendidikan')),
      findsOneWidget,
    );
    // Humanized bar labels.
    expect(find.text('SD'), findsOneWidget);
    expect(find.text('SMP'), findsOneWidget);
    expect(find.text('SMA'), findsOneWidget);
    expect(find.text('SLTP'), findsNothing);
    expect(find.text('SLTA'), findsNothing);
  });

  testWidgets('pie block shows horizontal bars', (tester) async {
    await tester.pumpWidget(_buildApp([_pieBlock]));
    await tester.pump();

    expect(find.text('Mata Pencaharian'), findsOneWidget);
    expect(
      find.byKey(const Key('demo-pie-mata_pencaharian-0')),
      findsOneWidget,
    );
    expect(find.text('Petani'), findsOneWidget);
    expect(find.text('Nelayan'), findsOneWidget);
  });

  testWidgets('hidden block is not rendered', (tester) async {
    await tester.pumpWidget(_buildApp([_numberBlock, _hiddenBlock]));
    await tester.pump();

    // Only number block visible; hidden block's label absent.
    expect(find.text('Distribusi Umur'), findsNothing);
    expect(find.text('Jumlah Penduduk'), findsOneWidget);
  });

  testWidgets('shows empty backend state without seed labels', (tester) async {
    await tester.pumpWidget(_buildApp([]));
    await tester.pump();

    expect(find.byKey(const Key('demo-empty-state')), findsOneWidget);
    expect(find.text('SLTP'), findsNothing);
    expect(find.text('SLTA'), findsNothing);
  });
}
