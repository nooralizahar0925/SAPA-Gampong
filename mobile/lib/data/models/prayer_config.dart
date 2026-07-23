class PrayerConfig {
  const PrayerConfig({
    this.lat,
    this.lng,
    this.calcMethod,
    this.timezone = 'Asia/Jakarta',
    this.aladhanMethod = 99,
    this.fajrAngle = 20.0,
    this.ishaAngle = 18.0,
    this.school = 0,
    this.fallbackTimes = const PrayerFallbackTimes(),
    this.adzanFileId,
    this.adzanUrl,
  });

  final double? lat;
  final double? lng;
  final String? calcMethod;
  final String timezone;
  final int aladhanMethod;
  final double fajrAngle;
  final double ishaAngle;
  final int school;
  final PrayerFallbackTimes fallbackTimes;
  final String? adzanFileId;
  final String? adzanUrl;

  factory PrayerConfig.fromJson(Map<String, Object?> json) {
    final ft = json['fallback_times'];
    final fallback = ft is Map
        ? PrayerFallbackTimes.fromJson(Map<String, Object?>.from(ft))
        : const PrayerFallbackTimes();

    return PrayerConfig(
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
      calcMethod: json['calc_method'] as String?,
      timezone: json['timezone'] as String? ?? 'Asia/Jakarta',
      aladhanMethod: json['aladhan_method'] as int? ?? 99,
      fajrAngle: (json['fajr_angle'] as num?)?.toDouble() ?? 20.0,
      ishaAngle: (json['isha_angle'] as num?)?.toDouble() ?? 18.0,
      school: json['school'] as int? ?? 0,
      fallbackTimes: fallback,
      adzanFileId: json['adzan_file_id'] as String?,
      adzanUrl: json['adzan_url'] as String?,
    );
  }
}

class PrayerFallbackTimes {
  const PrayerFallbackTimes({
    this.subuh,
    this.dhuhur,
    this.ashar,
    this.maghrib,
    this.isya,
  });

  final String? subuh;
  final String? dhuhur;
  final String? ashar;
  final String? maghrib;
  final String? isya;

  factory PrayerFallbackTimes.fromJson(Map<String, Object?> json) =>
      PrayerFallbackTimes(
        subuh: json['subuh'] as String?,
        dhuhur: json['dhuhur'] as String?,
        ashar: json['ashar'] as String?,
        maghrib: json['maghrib'] as String?,
        isya: json['isya'] as String?,
      );
}
