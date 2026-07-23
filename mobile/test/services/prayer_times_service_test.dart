import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/data/services/content_cache_service.dart';
import 'package:sapa_gampong/data/services/prayer_times_service.dart';

void main() {
  test('parses AlAdhan timings and strips timezone suffixes', () {
    final times = PrayerTimes.fromAladhanJson(
      {
        'code': 200,
        'data': {
          'timings': {
            'Fajr': '04:48 (WIB)',
            'Dhuhr': '12:34 (WIB)',
            'Asr': '15:54 (WIB)',
            'Maghrib': '18:41 (WIB)',
            'Isha': '19:51 (WIB)',
          },
        },
      },
      latitude: 4.7,
      longitude: 95.6,
      fetchedAt: DateTime(2026, 7, 20),
    );

    expect(times.subuh, '04:48');
    expect(times.dhuhur, '12:34');
    expect(times.ashar, '15:54');
    expect(times.maghrib, '18:41');
    expect(times.isya, '19:51');
    expect(times.sourceLabel, 'Internet · GPS Anda');
    expect(times.fromFallback, isFalse);
  });

  test('fallback marks sample data clearly', () {
    final times = PrayerTimes.fallback(fetchedAt: DateTime(2026, 7, 20));

    expect(times.subuh, '04:58');
    expect(times.sourceLabel, 'Data contoh Gampong Blang');
    expect(times.fromFallback, isTrue);
    expect(times.latitude, isNull);
  });

  test(
    'fetchForCoordinates falls back to cached timings when API is offline',
    () async {
      var offline = false;
      final dio = Dio(BaseOptions(baseUrl: 'https://example.test'));
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
              Response<Map<String, dynamic>>(
                requestOptions: options,
                statusCode: 200,
                data: const {
                  'code': 200,
                  'data': {
                    'timings': {
                      'Fajr': '04:49 (WIB)',
                      'Dhuhr': '12:35 (WIB)',
                      'Asr': '15:55 (WIB)',
                      'Maghrib': '18:42 (WIB)',
                      'Isha': '19:52 (WIB)',
                    },
                  },
                },
              ),
            );
          },
        ),
      );

      final service = PrayerTimesService(
        dio: dio,
        cache: MemoryContentCacheService(),
      );

      final fresh = await service.fetchForCoordinates(
        latitude: 4.7,
        longitude: 95.6,
        date: DateTime(2026, 7, 20),
      );
      expect(fresh.subuh, '04:49');

      offline = true;
      final cached = await service.fetchForCoordinates(
        latitude: 4.7,
        longitude: 95.6,
        date: DateTime(2026, 7, 20),
      );
      expect(cached.subuh, '04:49');
      expect(cached.maghrib, '18:42');
    },
  );
}
