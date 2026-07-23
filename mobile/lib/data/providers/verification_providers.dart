import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../repositories/verification_repository.dart';
import 'letter_providers.dart';

final verificationRepositoryProvider = Provider<VerificationRepository>((ref) {
  return VerificationRepository(ref.watch(dioClientProvider));
});
