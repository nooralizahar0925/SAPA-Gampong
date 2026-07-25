import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/app_preferences_service.dart';

final appPreferencesServiceProvider = Provider<AppPreferencesService>((ref) {
  return AppPreferencesService.openedOrMemory();
});

final appPreferencesProvider =
    AsyncNotifierProvider<AppPreferencesNotifier, AppPreferences>(
      AppPreferencesNotifier.new,
    );

class AppPreferencesNotifier extends AsyncNotifier<AppPreferences> {
  @override
  Future<AppPreferences> build() async {
    return ref.watch(appPreferencesServiceProvider).read();
  }

  Future<void> save(AppPreferences preferences) async {
    await ref.read(appPreferencesServiceProvider).save(preferences);
    state = AsyncData(preferences);
  }

  Future<void> setAdzanAlarmEnabled(bool enabled) async {
    final current =
        state.value ?? ref.read(appPreferencesServiceProvider).read();
    await save(current.copyWith(adzanAlarmEnabled: enabled));
  }

  Future<void> setLetterStatusNotifications(bool enabled) async {
    final current =
        state.value ?? ref.read(appPreferencesServiceProvider).read();
    await save(current.copyWith(letterStatusNotifications: enabled));
  }

  Future<void> setFeedbackStatusNotifications(bool enabled) async {
    final current =
        state.value ?? ref.read(appPreferencesServiceProvider).read();
    await save(current.copyWith(feedbackStatusNotifications: enabled));
  }

  Future<void> setVillageAnnouncements(bool enabled) async {
    final current =
        state.value ?? ref.read(appPreferencesServiceProvider).read();
    await save(current.copyWith(villageAnnouncements: enabled));
  }
}
