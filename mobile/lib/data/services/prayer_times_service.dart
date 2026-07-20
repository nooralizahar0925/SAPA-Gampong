import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';

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

  factory PrayerTimes.fromAladhanJson(
    Map<String, dynamic> json, {
    required double latitude,
    required double longitude,
    DateTime? fetchedAt,
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
      sourceLabel: 'Internet · GPS Anda',
      fetchedAt: fetchedAt ?? DateTime.now(),
      latitude: latitude,
      longitude: longitude,
    );
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
  PrayerTimesService({Dio? dio, PrayerLocationProvider? locationProvider})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: 'https://api.aladhan.com/v1',
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 20),
              headers: const {'Accept': 'application/json'},
            ),
          ),
      _locationProvider = locationProvider ?? _determineLocation;

  final Dio _dio;
  final PrayerLocationProvider _locationProvider;

  Future<PrayerTimes> fetchUsingGps({DateTime? date}) async {
    final location = await _locationProvider();
    return fetchForCoordinates(
      latitude: location.latitude,
      longitude: location.longitude,
      date: date,
    );
  }

  Future<PrayerTimes> fetchForCoordinates({
    required double latitude,
    required double longitude,
    DateTime? date,
  }) async {
    final requestedDate = date ?? DateTime.now();
    final formattedDate = DateFormat('dd-MM-yyyy').format(requestedDate);
    final response = await _dio.get<Map<String, dynamic>>(
      '/timings/$formattedDate',
      queryParameters: {
        'latitude': latitude,
        'longitude': longitude,
        'method': 99,
        'methodSettings': '20,null,18',
        'timezonestring': 'Asia/Jakarta',
        'school': 0,
      },
    );

    final data = response.data;
    if (data == null) {
      throw const FormatException('Response jadwal sholat kosong.');
    }

    return PrayerTimes.fromAladhanJson(
      data,
      latitude: latitude,
      longitude: longitude,
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

    return PrayerLocation(
      latitude: position.latitude,
      longitude: position.longitude,
    );
  }
}

class LocationPermissionException implements Exception {
  const LocationPermissionException(this.message);

  final String message;

  @override
  String toString() => message;
}
