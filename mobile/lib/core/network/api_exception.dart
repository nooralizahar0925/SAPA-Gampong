import 'package:dio/dio.dart';

class ApiException implements Exception {
  const ApiException({
    required this.code,
    required this.message,
    this.fields = const {},
    this.statusCode,
  });

  final String code;
  final String message;
  final Map<String, String> fields;
  final int? statusCode;

  factory ApiException.fromDioError(DioException error) {
    final response = error.response;
    final data = response?.data;

    if (data is Map<String, Object?>) {
      final envelope = data['error'];
      if (envelope is Map<String, Object?>) {
        return ApiException(
          code: _readString(envelope['code'], fallback: 'SERVER_ERROR'),
          message: _readString(
            envelope['message'],
            fallback: 'Terjadi kesalahan. Silakan coba lagi.',
          ),
          fields: _readFields(envelope['fields']),
          statusCode: response?.statusCode,
        );
      }
    }

    return ApiException(
      code: _fallbackCode(response?.statusCode),
      message: _fallbackMessage(error),
      statusCode: response?.statusCode,
    );
  }

  static String _readString(Object? value, {required String fallback}) {
    if (value is String && value.trim().isNotEmpty) {
      return value;
    }
    return fallback;
  }

  static Map<String, String> _readFields(Object? value) {
    if (value is! Map) {
      return const {};
    }

    return value.map(
      (key, fieldValue) => MapEntry(key.toString(), fieldValue.toString()),
    );
  }

  static String _fallbackCode(int? statusCode) {
    return switch (statusCode) {
      400 => 'VALIDATION_ERROR',
      401 => 'UNAUTHORIZED',
      403 => 'FORBIDDEN',
      404 => 'NOT_FOUND',
      429 => 'RATE_LIMITED',
      _ => 'SERVER_ERROR',
    };
  }

  static String _fallbackMessage(DioException error) {
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.connectionError) {
      return 'Koneksi bermasalah. Periksa jaringan lalu coba lagi.';
    }

    return 'Terjadi kesalahan. Silakan coba lagi.';
  }

  @override
  String toString() => 'ApiException($code, $message)';
}
