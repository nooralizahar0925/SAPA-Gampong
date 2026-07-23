import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../repositories/feedback_repository.dart';
import 'letter_providers.dart';

final feedbackRepositoryProvider = Provider<FeedbackRepository>((ref) {
  return FeedbackRepository(ref.watch(dioClientProvider));
});
