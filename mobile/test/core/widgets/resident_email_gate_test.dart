import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sapa_gampong/core/network/dio_client.dart';
import 'package:sapa_gampong/core/widgets/resident_email_gate.dart';
import 'package:sapa_gampong/data/models/resident_session.dart';
import 'package:sapa_gampong/data/providers/resident_providers.dart';
import 'package:sapa_gampong/data/repositories/resident_repository.dart';

class _FakeResidentRepository extends ResidentRepository {
  _FakeResidentRepository() : super(DioClient());

  @override
  Future<ResidentOtpChallenge> requestOtp(String email) async {
    return ResidentOtpChallenge(
      message: 'Kode OTP telah dikirim.',
      expiresAt: DateTime(2099),
    );
  }
}

void main() {
  testWidgets('OTP dialog scrolls in a compact keyboard viewport', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 520);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          residentRepositoryProvider.overrideWithValue(
            _FakeResidentRepository(),
          ),
        ],
        child: MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: const TextScaler.linear(1.3),
              viewInsets: const EdgeInsets.only(bottom: 180),
            ),
            child: child!,
          ),
          home: const _DialogLauncher(),
        ),
      ),
    );

    await tester.tap(find.text('Buka verifikasi'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField), 'warga@example.com');
    await tester.tap(find.text('Kirim OTP'));
    await tester.pumpAndSettle();

    expect(find.text('Masukkan OTP'), findsOneWidget);
    expect(find.text('Verifikasi'), findsOneWidget);
    expect(find.byType(SingleChildScrollView), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

class _DialogLauncher extends ConsumerWidget {
  const _DialogLauncher();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: Center(
        child: FilledButton(
          onPressed: () => showResidentEmailDialog(context, ref),
          child: const Text('Buka verifikasi'),
        ),
      ),
    );
  }
}
