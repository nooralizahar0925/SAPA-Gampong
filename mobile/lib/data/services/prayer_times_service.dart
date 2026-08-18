import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';

import '../models/prayer_config.dart';
import 'content_cache_service.dart';

typedef PrayerLocationProvider = Future<PrayerLocation> Function();

class PrayerLocation {
  const PrayerLocation({required this.latitude, required this.longitude});

  final double latitude;
  final double longitude;
}

class PrayerTimes {
  const PrayerTimes({
    required this.subuh,
    required this.dhuhur,
    required this.ashar,
    required this.maghrib,
    required this.isya,
    required this.sourceLabel,
    required this.fetchedAt,
    this.latitude,
    this.longitude,
    this.fromFallback = false,
  });

  final String subuh;
  final String dhuhur;
  final String ashar;
  final String maghrib;
  final String isya;
  final String sourceLabel;
  final DateTime fetchedAt;
  final double? latitude;
  final double? longitude;
  final bool fromFallback;

  // Hard-coded fallback used before any config is available.
  static PrayerTimes fallback({DateTime? fetchedAt}) {
    return PrayerTimes(
      subuh: '04:58',
      dhuhur: '12:31',
      ashar: '15:52',
      maghrib: '18:38',
      isya: '19:49',
      sourceLabel: 'Data contoh Gampong Blang',
      fetchedAt: fetchedAt ?? DateTime.now(),
      fromFallback: true,
    );
  }

  // Fallback built from the admin-configured times in PrayerConfig.
  factory PrayerTimes.fromConfigFallback(
    PrayerConfig config, {
    DateTime? fetchedAt,
  }) {
    final ft = config.fallbackTimes;
    return PrayerTimes(
      subuh: ft.subuh ?? '04:58',
      dhuhur: ft.dhuhur ?? '12:31',
      ashar: ft.ashar ?? '15:52',
      maghrib: ft.maghrib ?? '18:38',
      isya: ft.isya ?? '19:49',
      sourceLabel: 'Data Gampong Blang',
      fetchedAt: fetchedAt ?? DateTime.now(),
      fromFallback: true,
    );
  }

  factory PrayerTimes.fromAladhanJson(
    Map<String, dynamic> json, {
    required double latitude,
    required double longitude,
    DateTime? fetchedAt,
    String sourceLabel = 'Internet · GPS Anda',
  }) {
    final data = json['data'];
    if (data is! Map<String, dynamic>) {
      throw const FormatException(
        'Response jadwal sholat tidak memiliki data.',
      );
    }

    final timings = data['timings'];
    if (timings is! Map<String, dynamic>) {
      throw const FormatException(
        'Response jadwal sholat tidak memiliki timings.',
      );
    }

    return PrayerTimes(
      subuh: _cleanTime(timings['Fajr']),
      dhuhur: _cleanTime(timings['Dhuhr']),
      ashar: _cleanTime(timings['Asr']),
      maghrib: _cleanTime(timings['Maghrib']),
      isya: _cleanTime(timings['Isha']),
      sourceLabel: sourceLabel,
      fetchedAt: fetchedAt ?? DateTime.now(),
      latitude: latitude,
      longitude: longitude,
    );
  }

  factory PrayerTimes.fromCacheJson(Map<String, Object?> json) {
    return PrayerTimes(
      subuh: json['subuh'] as String? ?? '04:58',
      dhuhur: json['dhuhur'] as String? ?? '12:31',
      ashar: json['ashar'] as String? ?? '15:52',
      maghrib: json['maghrib'] as String? ?? '18:38',
      isya: json['isya'] as String? ?? '19:49',
      sourceLabel: json['source_label'] as String? ?? 'Internet',
      fetchedAt:
          DateTime.tryParse(json['fetched_at'] as String? ?? '') ??
          DateTime.now(),
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      fromFallback: json['from_fallback'] as bool? ?? false,
    );
  }

  Map<String, Object?> toCacheJson() {
    return {
      'subuh': subuh,
      'dhuhur': dhuhur,
      'ashar': ashar,
      'maghrib': maghrib,
      'isya': isya,
      'source_label': sourceLabel,
      'fetched_at': fetchedAt.toIso8601String(),
      'latitude': latitude,
      'longitude': longitude,
      'from_fallback': fromFallback,
    };
  }

  static String _cleanTime(Object? value) {
    final text = value?.toString() ?? '';
    final match = RegExp(r'\b([0-2]\d:[0-5]\d)\b').firstMatch(text);
    if (match == null) {
      throw FormatException('Format waktu sholat tidak valid: $text');
    }

    return match.group(1)!;
  }
}

class PrayerTimesService {
  PrayerTimesService({
    Dio? dio,
    PrayerLocationProvider? locationProvider,
    PrayerLocationProvider? passiveLocationProvider,
    this.cache,
  }) : _dio =
           dio ??
           Dio(
             BaseOptions(
               baseUrl: 'https://api.aladhan.com/v1',
               connectTimeout: const Duration(seconds: 15),
               receiveTimeout: const Duration(seconds: 20),
               headers: const {'Accept': 'application/json'},
             ),
           ),
       _locationProvider = locationProvider ?? _determineLocation,
       _passiveLocationProvider =
           passiveLocationProvider ?? _determineAvailableLocation;

  final Dio _dio;
  final PrayerLocationProvider _locationProvider;
  final PrayerLocationProvider _passiveLocationProvider;
  final ContentCacheService? cache;

  static PrayerLocation? _lastResolvedLocation;

  Future<PrayerTimes> fetchUsingGps({DateTime? date}) async {
    final location = await _locationProvider();
    return fetchForCoordinates(
      latitude: location.latitude,
      longitude: location.longitude,
      date: date,
    );
  }

  Future<PrayerTimes> fetchUsingGpsForConfig(
    PrayerConfig config, {
    DateTime? date,
  }) async {
    final location = await _locationProvider();
    final methodSettings =
        '${config.fajrAngle.round()},null,${config.ishaAngle.round()}';
    return fetchForCoordinates(
      latitude: location.latitude,
      longitude: location.longitude,
      date: date,
      aladhanMethod: config.aladhanMethod,
      methodSettings: methodSettings,
      timezone: config.timezone,
      school: config.school,
    );
  }

  /// Uses GPS only when permission has already been granted. This is safe for
  /// automatic screen loading because it never opens a system permission dialog.
  Future<PrayerTimes> fetchUsingAvailableGpsForConfig(
    PrayerConfig config, {
    DateTime? date,
  }) async {
    final location = await _passiveLocationProvider();
    final methodSettings =
        '${config.fajrAngle.round()},null,${config.ishaAngle.round()}';
    return fetchForCoordinates(
      latitude: location.latitude,
      longitude: location.longitude,
      date: date,
      aladhanMethod: config.aladhanMethod,
      methodSettings: methodSettings,
      timezone: config.timezone,
      school: config.school,
    );
  }

  Future<PrayerTimes> fetchForCoordinates({
    required double latitude,
    required double longitude,
    DateTime? date,
    int aladhanMethod = 99,
    String methodSettings = '20,null,18',
    String timezone = 'Asia/Jakarta',
    int school = 0,
  }) async {
    final requestedDate = date ?? DateTime.now();
    final formattedDate = DateFormat('dd-MM-yyyy').format(requestedDate);
    final params = <String, Object>{
      'latitude': latitude,
      'longitude': longitude,
      'method': aladhanMethod,
      'timezonestring': timezone,
      'school': school,
    };
    if (aladhanMethod == 99) params['methodSettings'] = methodSettings;

    final cacheKey = _prayerTimesCacheKey(
      date: requestedDate,
      latitude: latitude,
      longitude: longitude,
      aladhanMethod: aladhanMethod,
      methodSettings: methodSettings,
      timezone: timezone,
      school: school,
    );

    Future<Object?> fetch() async {
      final response = await _dio.get<Map<String, dynamic>>(
        '/timings/$formattedDate',
        queryParameters: params,
      );

      final data = response.data;
      if (data == null) {
        throw const FormatException('Response jadwal sholat kosong.');
      }

      return PrayerTimes.fromAladhanJson(
        data,
        latitude: latitude,
        longitude: longitude,
      ).toCacheJson();
    }

    final currentCache = cache;
    if (currentCache == null) {
      return PrayerTimes.fromCacheJson(_objectMap(await fetch()));
    }
    return currentCache.getOrFetch(
      key: cacheKey,
      fetch: fetch,
      decode: (data) => PrayerTimes.fromCacheJson(_objectMap(data)),
    );
  }

  // Fetch using village coordinates and method settings from PrayerConfig.
  Future<PrayerTimes> fetchForVillageConfig(
    PrayerConfig config, {
    DateTime? date,
  }) async {
    if (config.lat == null || config.lng == null) {
      throw const FormatException('Koordinat desa belum dikonfigurasi.');
    }
    final methodSettings =
        '${config.fajrAngle.round()},null,${config.ishaAngle.round()}';

    final times = await fetchForCoordinates(
      latitude: config.lat!,
      longitude: config.lng!,
      date: date,
      aladhanMethod: config.aladhanMethod,
      methodSettings: methodSettings,
      timezone: config.timezone,
      school: config.school,
    );

    return PrayerTimes(
      subuh: times.subuh,
      dhuhur: times.dhuhur,
      ashar: times.ashar,
      maghrib: times.maghrib,
      isya: times.isya,
      sourceLabel: 'Internet · Koordinat Desa',
      fetchedAt: times.fetchedAt,
      latitude: times.latitude,
      longitude: times.longitude,
    );
  }

  static Future<PrayerLocation> _determineLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const LocationPermissionException(
        'Layanan lokasi perangkat belum aktif.',
      );
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied) {
      throw const LocationPermissionException('Izin lokasi ditolak.');
    }

    if (permission == LocationPermission.deniedForever) {
      throw const LocationPermissionException(
        'Izin lokasi ditolak permanen. Ubah izin dari pengaturan perangkat.',
      );
    }

    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.medium,
        timeLimit: Duration(seconds: 15),
      ),
    );

    final location = PrayerLocation(
      latitude: position.latitude,
      longitude: position.longitude,
    );
    _lastResolvedLocation = location;
    return location;
  }

  static Future<PrayerLocation> _determineAvailableLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const LocationPermissionException(
        'Layanan lokasi perangkat belum aktif.',
      );
    }

    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      throw const LocationPermissionException(
        'Izin lokasi belum diberikan. Gunakan tombol GPS untuk mengaktifkannya.',
      );
    }
    if (permission == LocationPermission.deniedForever) {
      throw const LocationPermissionException(
        'Izin lokasi ditolak permanen. Ubah izin dari pengaturan perangkat.',
      );
    }

    final remembered = _lastResolvedLocation;
    if (remembered != null) return remembered;

    final position = await Geolocator.getLastKnownPosition();
    if (position == null) {
      throw const LocationPermissionException(
        'Belum ada lokasi terakhir. Gunakan tombol GPS untuk mengambil lokasi.',
      );
    }

    final location = PrayerLocation(
      latitude: position.latitude,
      longitude: position.longitude,
    );
    _lastResolvedLocation = location;
    return location;
  }
}

class LocationPermissionException implements Exception {
  const LocationPermissionException(this.message);

  final String message;

  @override
  String toString() => message;
}

String _prayerTimesCacheKey({
  required DateTime date,
  required double latitude,
  required double longitude,
  required int aladhanMethod,
  required String methodSettings,
  required String timezone,
  required int school,
}) {
  final day = DateFormat('yyyy-MM-dd').format(date);
  final lat = latitude.toStringAsFixed(4);
  final lng = longitude.toStringAsFixed(4);
  return 'prayer-times:$day:$lat:$lng:$aladhanMethod:$methodSettings:$timezone:$school';
}

Map<String, Object?> _objectMap(Object? value) {
  if (value is Map<String, Object?>) return value;
  if (value is Map) return Map<String, Object?>.from(value);
  return {};
}
