import 'package:dio/dio.dart';

import '../../core/network/dio_client.dart';
import '../models/resident_session.dart';
import '../services/content_cache_service.dart';

class ResidentRepository {
  ResidentRepository(this._client, {this.cache});

  final DioClient _client;
  final ContentCacheService? cache;

  Future<ResidentOtpChallenge> requestOtp(String email) async {
    final res = await _client.dio.post<Map<String, Object?>>(
      '/resident/email/request-otp',
      data: {'email': email.trim()},
    );
    return ResidentOtpChallenge.fromJson(res.data ?? {});
  }

  Future<ResidentSession> verifyOtp({
    required String email,
    required String otp,
  }) async {
    final res = await _client.dio.post<Map<String, Object?>>(
      '/resident/email/verify-otp',
      data: {'email': email.trim(), 'otp': otp.trim()},
    );
    return ResidentSession.fromJson(res.data ?? {});
  }

  Future<List<ResidentRequestItem>> requests(ResidentSession session) {
    return _cached(
      key: 'resident:requests:${session.email}',
      fetch: () async {
        final res = await _client.dio.get<Map<String, Object?>>(
          '/resident/requests',
          options: _auth(session),
        );
        return res.data?['items'] ?? [];
      },
      decode: (data) =>
          _objectMaps(data).map(ResidentRequestItem.fromJson).toList(),
    );
  }

  Future<List<ResidentFeedbackItem>> feedback(ResidentSession session) {
    return _cached(
      key: 'resident:feedback:${session.email}',
      fetch: () async {
        final res = await _client.dio.get<Map<String, Object?>>(
          '/resident/feedback',
          options: _auth(session),
        );
        return res.data?['items'] ?? [];
      },
      decode: (data) =>
          _objectMaps(data).map(ResidentFeedbackItem.fromJson).toList(),
    );
  }

  Options _auth(ResidentSession session) {
    return Options(headers: {'Authorization': 'Bearer ${session.token}'});
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

List<Map<String, Object?>> _objectMaps(Object? value) {
  if (value is! List) return [];
  return value.whereType<Map>().map(Map<String, Object?>.from).toList();
}
