import 'package:dio/dio.dart';

import '../config/env.dart';
import 'api_exception.dart';

class DioClient {
  DioClient({String baseUrl = Env.apiBaseUrl, Dio? dio})
    : dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: baseUrl,
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 20),
              sendTimeout: const Duration(seconds: 20),
              headers: const {'Accept': 'application/json'},
            ),
          ) {
    this.dio.interceptors.add(_ApiExceptionInterceptor());
  }

  final Dio dio;
}

class _ApiExceptionInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    handler.reject(
      DioException(
        requestOptions: err.requestOptions,
        response: err.response,
        type: err.type,
        error: ApiException.fromDioError(err),
        message: err.message,
        stackTrace: err.stackTrace,
      ),
    );
  }
}
