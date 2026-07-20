import 'package:flutter_test/flutter_test.dart';
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
}
