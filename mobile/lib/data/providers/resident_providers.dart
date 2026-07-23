import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/resident_session.dart';
import '../repositories/resident_repository.dart';
import '../services/resident_session_service.dart';
import 'cache_providers.dart';
import 'letter_providers.dart';

final residentSessionServiceProvider = Provider<ResidentSessionService>((ref) {
  return ResidentSessionService.openedOrMemory();
});

final residentRepositoryProvider = Provider<ResidentRepository>((ref) {
  return ResidentRepository(
    ref.watch(dioClientProvider),
    cache: ref.watch(contentCacheServiceProvider),
  );
});

final residentSessionProvider =
    AsyncNotifierProvider<ResidentSessionNotifier, ResidentSession?>(
      ResidentSessionNotifier.new,
    );

class ResidentSessionNotifier extends AsyncNotifier<ResidentSession?> {
  @override
  Future<ResidentSession?> build() async {
    return ref.watch(residentSessionServiceProvider).read();
  }

  Future<void> save(ResidentSession session) async {
    await ref.read(residentSessionServiceProvider).save(session);
    state = AsyncData(session);
    ref.invalidate(residentRequestsProvider);
    ref.invalidate(residentFeedbackProvider);
  }

  Future<void> clear() async {
    await ref.read(residentSessionServiceProvider).clear();
    state = const AsyncData(null);
    ref.invalidate(residentRequestsProvider);
    ref.invalidate(residentFeedbackProvider);
  }
}

final residentRequestsProvider = FutureProvider<List<ResidentRequestItem>>((
  ref,
) async {
  final session = await ref.watch(residentSessionProvider.future);
  if (session == null) return const [];
  return ref.watch(residentRepositoryProvider).requests(session);
});

final residentFeedbackProvider = FutureProvider<List<ResidentFeedbackItem>>((
  ref,
) async {
  final session = await ref.watch(residentSessionProvider.future);
  if (session == null) return const [];
  return ref.watch(residentRepositoryProvider).feedback(session);
});
