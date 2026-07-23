import '../../core/config/env.dart';
import '../../core/network/dio_client.dart';
import '../models/verification_result.dart';

class VerificationRepository {
  VerificationRepository(this._client);

  final DioClient _client;

  Future<VerificationResult> verify(String tokenOrUrl) async {
    final token = extractVerificationToken(tokenOrUrl);
    final res = await _client.dio.get<Map<String, Object?>>(
      '${_publicBaseUrl()}/verify/$token',
    );
    return VerificationResult.fromJson(res.data ?? {});
  }
}

String extractVerificationToken(String value) {
  final raw = value.trim();
  if (raw.isEmpty) return raw;

  final parsed = Uri.tryParse(raw);
  if (parsed != null && parsed.pathSegments.isNotEmpty) {
    final verifyIndex = parsed.pathSegments.indexOf('verify');
    if (verifyIndex >= 0 && verifyIndex + 1 < parsed.pathSegments.length) {
      return parsed.pathSegments[verifyIndex + 1].trim();
    }
  }

  final marker = '/verify/';
  final markerIndex = raw.indexOf(marker);
  if (markerIndex >= 0) {
    return raw
        .substring(markerIndex + marker.length)
        .split(RegExp(r'[?#/]'))
        .first
        .trim();
  }

  return raw.split(RegExp(r'[\s?#/]')).first.trim();
}

String _publicBaseUrl() {
  return Env.apiBaseUrl.replaceFirst(RegExp(r'/api/?$'), '');
}
