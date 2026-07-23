import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/submission_queue_service.dart';
import 'letter_providers.dart';

final submissionQueueProvider = Provider<SubmissionQueueService>((ref) {
  return HiveSubmissionQueueService.openedOrMemory(
    ref.watch(dioClientProvider),
  );
});
