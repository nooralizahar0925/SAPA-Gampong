import '../../core/network/dio_client.dart';
import '../models/letter_request.dart';
import '../models/letter_type.dart';
import '../services/content_cache_service.dart';

class LetterRepository {
  LetterRepository(this._client, {this.pushTokenPayload, this.cache});

  final DioClient _client;
  final Future<Map<String, Object?>?> Function()? pushTokenPayload;
  final ContentCacheService? cache;

  Future<List<LetterType>> letterTypes() async {
    return _cached(
      key: ContentCacheKeys.letterTypes,
      fetch: () async {
        final res = await _client.dio.get<List<dynamic>>('/letter-types');
        return res.data ?? [];
      },
      decode: (data) => _objectMaps(data).map(LetterType.fromJson).toList(),
    );
  }

  Future<CreatedRequest> submit(LetterRequestDraft draft) async {
    final data = draft.toJson();
    final pushPayload = await pushTokenPayload?.call();
    if (pushPayload != null) data.addAll(pushPayload);

    final res = await _client.dio.post<Map<String, Object?>>(
      '/requests',
      data: data,
    );
    return CreatedRequest.fromJson(res.data!);
  }

  Future<TrackStatus> track(String referenceCode) async {
    final code = referenceCode.trim().toUpperCase();
    return _cached(
      key: ContentCacheKeys.requestTrack(code),
      fetch: () async {
        final res = await _client.dio.get<Map<String, Object?>>(
          '/requests/track/$code',
        );
        return res.data ?? {};
      },
      decode: (data) => TrackStatus.fromJson(_objectMap(data)),
    );
  }

  Future<T> _cached<T>({
    required String key,
    required Future<Object?> Function() fetch,
    required T Function(Object? data) decode,
  }) {
    final currentCache = cache;
    if (currentCache == null) return fetch().then(decode);
    return currentCache.getOrFetch(key: key, fetch: fetch, decode: decode);
  }
}

Map<String, Object?> _objectMap(Object? value) {
  if (value is Map<String, Object?>) return value;
  if (value is Map) return Map<String, Object?>.from(value);
  return {};
}

List<Map<String, Object?>> _objectMaps(Object? value) {
  if (value is! List) return [];
  return value.whereType<Map>().map(Map<String, Object?>.from).toList();
}
