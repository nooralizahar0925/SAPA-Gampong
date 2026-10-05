import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/data/services/content_cache_service.dart';
import 'package:sapa_gampong/data/services/prayer_times_service.dart';

void main() {
  Map<String, dynamic> responseWithDate(Object? date) => {
    'data': {
      'timings': {
        'Fajr': '05:07',
        'Dhuhr': '12:26',
        'Asr': '15:41',
        'Maghrib': '18:28',
        'Isha': '19:37',
      },
      'date': date,
    },
  };

  test('uses the sourced Hijri date only for its matching calendar day', () {
    final times = PrayerTimes.fromAladhanJson(
      responseWithDate({
        'gregorian': {'date': '05-10-2026'},
        'hijri': {
          'day': '24',
          'month': {'number': 4},
          'year': '1448',
        },
      }),
      latitude: 4.7,
      longitude: 95.6,
    );
    expect(
      times.hijriDateFor(DateTime(2026, 10, 5, 20)),
      "24 Rabi'ul Akhir 1448 H",
    );
    expect(times.hijriDateFor(DateTime(2026, 10, 6)), isNull);
    final cached = PrayerTimes.fromCacheJson(times.toCacheJson());
    expect(cached.hijriDateFor(DateTime(2026, 10, 5)), times.hijriDate);
  });

  test('missing or invalid calendar data does not invent a Hijri date', () {
    for (final date in [
      null,
      {},
      {
        'gregorian': {'date': '31-02-2026'},
        'hijri': {
          'day': '31',
          'month': {'number': 13},
          'year': '1448',
        },
      },
    ]) {
      final times = PrayerTimes.fromAladhanJson(
        responseWithDate(date),
        latitude: 4.7,
        longitude: 95.6,
      );
      expect(times.hijriDateFor(DateTime(2026, 10, 5)), isNull);
      expect(times.subuh, '05:07');
    }
    expect(PrayerTimes.fallback().hijriDate, isNull);
  });

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
