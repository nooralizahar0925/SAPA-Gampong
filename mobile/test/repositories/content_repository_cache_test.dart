import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/core/network/dio_client.dart';
import 'package:sapa_gampong/data/repositories/content_repository.dart';
import 'package:sapa_gampong/data/services/content_cache_service.dart';

void main() {
  test('profile falls back to cached JSON when API is offline', () async {
    var offline = false;
    final dio = Dio(BaseOptions(baseUrl: 'http://test'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (offline) {
            handler.reject(
              DioException(
                requestOptions: options,
                type: DioExceptionType.connectionError,
                message: 'offline',
              ),
            );
            return;
          }

          handler.resolve(
            Response<Map<String, Object?>>(
              requestOptions: options,
              statusCode: 200,
              data: const {
                'name': 'Gampong Cache',
                'description': 'Konten dari cache.',
                'kecamatan': 'Krueng Sabee',
                'kabupaten': 'Aceh Jaya',
              },
            ),
          );
        },
      ),
    );

    final cache = MemoryContentCacheService();
    final repository = ContentRepository(DioClient(dio: dio), cache: cache);

    final fresh = await repository.profile();
    expect(fresh.name, 'Gampong Cache');
    expect(cache.updatedAt(ContentCacheKeys.profile), isNotNull);

    offline = true;
    final cached = await repository.profile();
    expect(cached.name, 'Gampong Cache');
    expect(cached.description, 'Konten dari cache.');
  });

  test('offline profile without cache still throws', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.reject(
            DioException(
              requestOptions: options,
              type: DioExceptionType.connectionError,
              message: 'offline',
            ),
          );
        },
      ),
    );

    final repository = ContentRepository(
      DioClient(dio: dio),
      cache: MemoryContentCacheService(),
    );

    expect(repository.profile(), throwsA(isA<DioException>()));
  });
}
