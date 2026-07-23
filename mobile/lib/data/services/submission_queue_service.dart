import 'package:hive_flutter/hive_flutter.dart';

import '../../core/network/dio_client.dart';

class PendingSubmission {
  const PendingSubmission({
    required this.id,
    required this.kind,
    required this.path,
    required this.payload,
    required this.createdAt,
  });

  final String id;
  final String kind;
  final String path;
  final Map<String, Object?> payload;
  final DateTime createdAt;
}

abstract class SubmissionQueueService {
  static const boxName = 'submission_queue';

  Future<void> enqueueLetter(Map<String, Object?> payload) {
    return enqueue(kind: 'letter', path: '/requests', payload: payload);
  }

  Future<void> enqueueFeedback(Map<String, Object?> payload) {
    return enqueue(kind: 'feedback', path: '/feedback', payload: payload);
  }

  Future<void> enqueue({
    required String kind,
    required String path,
    required Map<String, Object?> payload,
  });

  List<PendingSubmission> pending();

  Future<int> retryPending();
}

class HiveSubmissionQueueService extends SubmissionQueueService {
  HiveSubmissionQueueService(this._client, this._box);

  final DioClient _client;
  final Box<Object?> _box;

  static Future<void> init() async {
    if (!Hive.isBoxOpen(SubmissionQueueService.boxName)) {
      await Hive.openBox<Object?>(SubmissionQueueService.boxName);
    }
  }

  static SubmissionQueueService openedOrMemory(DioClient client) {
    if (!Hive.isBoxOpen(SubmissionQueueService.boxName)) {
      return MemorySubmissionQueueService(client);
    }
    return HiveSubmissionQueueService(
      client,
      Hive.box<Object?>(SubmissionQueueService.boxName),
    );
  }

  @override
  Future<void> enqueue({
    required String kind,
    required String path,
    required Map<String, Object?> payload,
  }) {
    final id = _queueId(kind);
    return _box.put(id, {
      'id': id,
      'kind': kind,
      'path': path,
      'payload': _normalizeJson(payload),
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  @override
  List<PendingSubmission> pending() {
    return [
      for (final value in _box.values)
        if (_fromEntry(value) != null) _fromEntry(value)!,
    ];
  }

  @override
  Future<int> retryPending() async {
    var sent = 0;
    for (final item in pending()) {
      try {
        await _client.dio.post<Object?>(item.path, data: item.payload);
        await _box.delete(item.id);
        sent += 1;
      } catch (_) {
        // Keep item queued for the next app start / retry.
      }
    }
    return sent;
  }
}

class MemorySubmissionQueueService extends SubmissionQueueService {
  MemorySubmissionQueueService(this._client);

  final DioClient _client;
  final _items = <String, PendingSubmission>{};

  @override
  Future<void> enqueue({
    required String kind,
    required String path,
    required Map<String, Object?> payload,
  }) async {
    final id = _queueId(kind);
    _items[id] = PendingSubmission(
      id: id,
      kind: kind,
      path: path,
      payload: Map<String, Object?>.from(_normalizeJson(payload) as Map),
      createdAt: DateTime.now(),
    );
  }

  @override
  List<PendingSubmission> pending() => _items.values.toList();

  @override
  Future<int> retryPending() async {
    var sent = 0;
    for (final item in pending()) {
      try {
        await _client.dio.post<Object?>(item.path, data: item.payload);
        _items.remove(item.id);
        sent += 1;
      } catch (_) {
        // Keep item queued for the next app start / retry.
      }
    }
    return sent;
  }
}

PendingSubmission? _fromEntry(Object? value) {
  if (value is! Map) return null;
  final id = value['id'] as String?;
  final kind = value['kind'] as String?;
  final path = value['path'] as String?;
  final payload = value['payload'];
  final createdAtRaw = value['created_at'];
  final createdAt = createdAtRaw is String
      ? DateTime.tryParse(createdAtRaw)
      : null;
  if (id == null ||
      kind == null ||
      path == null ||
      payload is! Map ||
      createdAt == null) {
    return null;
  }

  return PendingSubmission(
    id: id,
    kind: kind,
    path: path,
    payload: Map<String, Object?>.from(payload),
    createdAt: createdAt,
  );
}

String _queueId(String kind) {
  return '$kind-${DateTime.now().microsecondsSinceEpoch}';
}

Object? _normalizeJson(Object? value) {
  if (value is Map) {
    return {
      for (final entry in value.entries)
        entry.key.toString(): _normalizeJson(entry.value),
    };
  }
  if (value is List) {
    return [for (final item in value) _normalizeJson(item)];
  }
  return value;
}
