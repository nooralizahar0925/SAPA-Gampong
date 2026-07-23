import 'package:hive_flutter/hive_flutter.dart';

import '../models/resident_session.dart';

class ResidentSessionService {
  ResidentSessionService(this._box);

  static const boxName = 'resident_session';
  static const _sessionKey = 'verified_email_session';

  final Box<Object?> _box;

  static Future<void> init() async {
    if (!Hive.isBoxOpen(boxName)) {
      await Hive.openBox<Object?>(boxName);
    }
  }

  static ResidentSessionService openedOrMemory() {
    if (!Hive.isBoxOpen(boxName)) return ResidentSessionService.memory();
    return ResidentSessionService(Hive.box<Object?>(boxName));
  }

  factory ResidentSessionService.memory() {
    return ResidentSessionService(_MemoryBox());
  }

  ResidentSession? read() {
    final raw = _box.get(_sessionKey);
    if (raw is! Map) return null;
    final session = ResidentSession.fromJson(Map<String, Object?>.from(raw));
    return session.isExpired ? null : session;
  }

  Future<void> save(ResidentSession session) {
    return _box.put(_sessionKey, session.toJson());
  }

  Future<void> clear() {
    return _box.delete(_sessionKey);
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
  Future<void> delete(dynamic key) async {
    _values.remove(key);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
