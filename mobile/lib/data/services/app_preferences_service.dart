import 'package:hive_flutter/hive_flutter.dart';

class AppPreferences {
  const AppPreferences({
    this.adzanAlarmEnabled = false,
    this.letterStatusNotifications = true,
    this.feedbackStatusNotifications = true,
    this.villageAnnouncements = false,
  });

  final bool adzanAlarmEnabled;
  final bool letterStatusNotifications;
  final bool feedbackStatusNotifications;
  final bool villageAnnouncements;

  AppPreferences copyWith({
    bool? adzanAlarmEnabled,
    bool? letterStatusNotifications,
    bool? feedbackStatusNotifications,
    bool? villageAnnouncements,
  }) {
    return AppPreferences(
      adzanAlarmEnabled: adzanAlarmEnabled ?? this.adzanAlarmEnabled,
      letterStatusNotifications:
          letterStatusNotifications ?? this.letterStatusNotifications,
      feedbackStatusNotifications:
          feedbackStatusNotifications ?? this.feedbackStatusNotifications,
      villageAnnouncements: villageAnnouncements ?? this.villageAnnouncements,
    );
  }

  factory AppPreferences.fromJson(Map<String, Object?> json) {
    return AppPreferences(
      adzanAlarmEnabled: json['adzan_alarm_enabled'] == true,
      letterStatusNotifications:
          json['letter_status_notifications'] as bool? ?? true,
      feedbackStatusNotifications:
          json['feedback_status_notifications'] as bool? ?? true,
      villageAnnouncements: json['village_announcements'] == true,
    );
  }

  Map<String, Object?> toJson() => {
    'adzan_alarm_enabled': adzanAlarmEnabled,
    'letter_status_notifications': letterStatusNotifications,
    'feedback_status_notifications': feedbackStatusNotifications,
    'village_announcements': villageAnnouncements,
  };
}

class AppPreferencesService {
  AppPreferencesService(this._box);

  static const boxName = 'app_preferences';
  static const _preferencesKey = 'preferences';

  final Box<Object?> _box;

  static Future<void> init() async {
    if (!Hive.isBoxOpen(boxName)) {
      await Hive.openBox<Object?>(boxName);
    }
  }

  static AppPreferencesService openedOrMemory() {
    if (!Hive.isBoxOpen(boxName)) return AppPreferencesService.memory();
    return AppPreferencesService(Hive.box<Object?>(boxName));
  }

  factory AppPreferencesService.memory({AppPreferences? initial}) {
    final box = _MemoryBox();
    if (initial != null) {
      box.put(_preferencesKey, initial.toJson());
    }
    return AppPreferencesService(box);
  }

  AppPreferences read() {
    final raw = _box.get(_preferencesKey);
    if (raw is! Map) return const AppPreferences();
    return AppPreferences.fromJson(Map<String, Object?>.from(raw));
  }

  Future<void> save(AppPreferences preferences) {
    return _box.put(_preferencesKey, preferences.toJson());
  }
}

class _MemoryBox extends Box<Object?> {
  final _values = <dynamic, Object?>{};

  @override
  Object? get(dynamic key, {Object? defaultValue}) {
    return _values[key] ?? defaultValue;
  }

  @override
  Future<void> put(dynamic key, Object? value) async {
    _values[key] = value;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
