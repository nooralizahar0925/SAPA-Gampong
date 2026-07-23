import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/core/network/dio_client.dart';
import 'package:sapa_gampong/data/models/verification_result.dart';
import 'package:sapa_gampong/data/providers/verification_providers.dart';
import 'package:sapa_gampong/data/repositories/verification_repository.dart';
import 'package:sapa_gampong/features/verification/verification_screen.dart';

class _FakeVerificationRepository extends VerificationRepository {
  _FakeVerificationRepository(this.result) : super(DioClient());

  final VerificationResult result;
  String? requestedToken;

  @override
  Future<VerificationResult> verify(String tokenOrUrl) async {
    requestedToken = extractVerificationToken(tokenOrUrl);
    return result;
  }
}

Widget _wrap(_FakeVerificationRepository repository, {String? initialToken}) {
  return ProviderScope(
    overrides: [verificationRepositoryProvider.overrideWithValue(repository)],
    child: MaterialApp(home: VerificationScreen(initialToken: initialToken)),
  );
}

void main() {
  testWidgets('verifies a pasted QR URL and shows letter details', (
    tester,
  ) async {
    final repository = _FakeVerificationRepository(
      const VerificationResult.valid(
        VerifiedLetterDetails(
          nomorSurat: '400.10.4.4/017/2026',
          jenisSurat: 'Surat Keterangan Miskin',
          tanggalTerbit: '2026-07-20',
          penandatangan: 'Sofian - Keuchik Gampong Blang',
          perihal: 'a.n. B*** (NIK 1107********0001)',
        ),
      ),
    );

    await tester.pumpWidget(_wrap(repository));
    expect(find.byKey(const Key('verification-scan')), findsOneWidget);
    await tester.enterText(
      find.byKey(const Key('verification-input')),
      'https://gampongblangdigital.com/verify/token-abc',
    );
    await tester.tap(find.byKey(const Key('verification-submit')));
    await tester.pumpAndSettle();

    expect(repository.requestedToken, 'token-abc');
    expect(find.byKey(const Key('verification-valid')), findsOneWidget);
    expect(find.text('400.10.4.4/017/2026'), findsOneWidget);
    expect(find.text('20 Juli 2026'), findsOneWidget);
  });

  testWidgets('shows invalid state for an unknown token', (tester) async {
    final repository = _FakeVerificationRepository(
      const VerificationResult.invalid(),
    );

    await tester.pumpWidget(_wrap(repository));
    await tester.enterText(
      find.byKey(const Key('verification-input')),
      'unknown-token',
    );
    await tester.tap(find.byKey(const Key('verification-submit')));
    await tester.pumpAndSettle();

    expect(repository.requestedToken, 'unknown-token');
    expect(find.byKey(const Key('verification-invalid')), findsOneWidget);
    expect(find.textContaining('tidak terverifikasi'), findsOneWidget);
  });

  testWidgets('auto-verifies an initial token', (tester) async {
    final repository = _FakeVerificationRepository(
      const VerificationResult.invalid(),
    );

    await tester.pumpWidget(_wrap(repository, initialToken: 'route-token'));
    await tester.pumpAndSettle();

    expect(repository.requestedToken, 'route-token');
    expect(find.byKey(const Key('verification-invalid')), findsOneWidget);
  });
}
