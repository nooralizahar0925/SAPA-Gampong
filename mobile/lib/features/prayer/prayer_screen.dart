import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/cached_api_image.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/mosque.dart';
import '../../data/models/prayer_config.dart';
import '../../data/providers/app_preferences_providers.dart';
import '../../data/providers/content_providers.dart';
import '../../data/services/prayer_times_service.dart';

class PrayerScreen extends ConsumerStatefulWidget {
  const PrayerScreen({super.key});

  @override
  ConsumerState<PrayerScreen> createState() => _PrayerScreenState();
}

class _PrayerScreenState extends ConsumerState<PrayerScreen> {
  bool _loading = false;
  PrayerTimes _prayerTimes = PrayerTimes.fallback();
  String? _errorMessage;

  String? _adzanUrl;
  PrayerConfig? _config;

  @override
  void initState() {
    super.initState();
    _loadConfig();
  }

  Future<void> _loadConfig() async {
    if (!mounted) return;
    setState(() => _loading = true);

    try {
      final config = await ref.read(prayerConfigProvider.future);
      if (!mounted) return;

      // Upgrade fallback to admin-configured times.
      setState(() {
        _config = config;
        _prayerTimes = PrayerTimes.fromConfigFallback(config);
        _adzanUrl = config.adzanUrl;
        _loading = false;
      });

      await _fetchPreferredSchedule(config);
    } catch (_) {
      // Keep hard-coded fallback on any config error.
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _fetchPreferredSchedule(
    PrayerConfig config, {
    bool showGpsError = false,
  }) async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    final service = ref.read(prayerTimesServiceProvider);
    try {
      final times = await service.fetchUsingGpsForConfig(config);
      if (!mounted) return;
      setState(() {
        _prayerTimes = times;
        _loading = false;
      });
      unawaited(_syncAlarmSchedule());
    } catch (gpsError) {
      if (config.lat != null && config.lng != null) {
        await _fetchForVillageFallback(config, gpsError, showGpsError);
        return;
      }

      if (mounted) {
        setState(() {
          _errorMessage = showGpsError ? _friendlyError(gpsError) : null;
          _loading = false;
        });
        unawaited(_syncAlarmSchedule());
      }
    }
  }

  Future<void> _fetchForVillageFallback(
    PrayerConfig config,
    Object gpsError,
    bool showGpsError,
  ) async {
    try {
      final service = ref.read(prayerTimesServiceProvider);
      final times = await service.fetchForVillageConfig(config);
      if (!mounted) return;
      setState(() {
        _prayerTimes = times;
        _loading = false;
      });
      unawaited(_syncAlarmSchedule());
    } catch (_) {
      // Village fetch failed too; config fallback already set.
      if (mounted) {
        setState(() {
          _errorMessage = showGpsError ? _friendlyError(gpsError) : null;
          _loading = false;
        });
        unawaited(_syncAlarmSchedule());
      }
    }
  }

  Future<void> _syncAlarmSchedule() async {
    final preferences = await ref.read(appPreferencesProvider.future);
    final notifications = ref.read(notificationServiceProvider);
    if (!preferences.adzanAlarmEnabled) {
      await notifications.cancel();
      return;
    }

    final url = _adzanUrl;
    if (url == null || url.isEmpty) return;

    await notifications.scheduleDaily(prayerTimes: _prayerTimes, adzanUrl: url);
  }

  Future<void> _loadFromGps() async {
    if (_loading) return;

    await _fetchPreferredSchedule(
      _config ?? const PrayerConfig(),
      showGpsError: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    final activePrayer = _activePrayer(_prayerTimes);
    final preferences = ref.watch(appPreferencesProvider);
    final alarmEnabled = preferences.value?.adzanAlarmEnabled ?? false;

    return SapaScaffold(
      title: 'Jadwal Sholat',
      subtitle: 'Gampong Blang · WIB',
      leading: const SapaBackButton(),
      body: ListView(
        children: [
          _CountdownCard(activePrayer: activePrayer, prayerTimes: _prayerTimes),
          const SizedBox(height: 14),
          _PrayerRow(
            'Subuh',
            _prayerTimes.subuh,
            active: activePrayer == 'Subuh',
          ),
          _PrayerRow(
            'Dhuhur',
            _prayerTimes.dhuhur,
            active: activePrayer == 'Dhuhur',
          ),
          _PrayerRow(
            'Ashar',
            _prayerTimes.ashar,
            active: activePrayer == 'Ashar',
          ),
          _PrayerRow(
            'Maghrib',
            _prayerTimes.maghrib,
            active: activePrayer == 'Maghrib',
          ),
          _PrayerRow('Isya', _prayerTimes.isya, active: activePrayer == 'Isya'),
          const SizedBox(height: 12),
          _AdzanAlarmStatusCard(
            enabled: alarmEnabled,
            hasAudio: _adzanUrl != null && _adzanUrl!.isNotEmpty,
          ),
          const SizedBox(height: 12),
          _PrayerSourceCard(
            loading: _loading,
            prayerTimes: _prayerTimes,
            errorMessage: _errorMessage,
            onRefresh: _loadFromGps,
          ),
          const SectionTitle('Masjid & Meunasah'),
          _MosqueList(mosques: ref.watch(mosquesProvider)),
        ],
      ),
    );
  }

  static String _friendlyError(Object error) {
    if (error is LocationPermissionException) return error.message;
    return 'Belum bisa mengambil jadwal dari GPS/internet. Data contoh tetap ditampilkan.';
  }
}

class _AdzanAlarmStatusCard extends StatelessWidget {
  const _AdzanAlarmStatusCard({required this.enabled, required this.hasAudio});

  final bool enabled;
  final bool hasAudio;

  @override
  Widget build(BuildContext context) {
    final ready = enabled && hasAudio;
    final title = ready
        ? 'Alarm Suara Azan Aktif'
        : enabled
        ? 'Alarm Suara Azan Belum Siap'
        : 'Alarm Suara Azan Nonaktif';

    return Card(
      key: const Key('prayer-adzan-status'),
      color: ready ? AppTheme.deepGreen : null,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: ready ? Colors.white.withAlpha(32) : AppTheme.g50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                ready
                    ? Icons.notifications_active_outlined
                    : Icons.notifications_off_outlined,
                color: ready ? Colors.white : AppTheme.villageGreen,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: ready ? Colors.white : AppTheme.ink900,
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MosqueList extends StatelessWidget {
  const _MosqueList({required this.mosques});

  final AsyncValue<List<Mosque>> mosques;

  @override
  Widget build(BuildContext context) {
    return mosques.when(
      loading: () => const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Row(
            children: [
              SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              SizedBox(width: 12),
              Text('Memuat data masjid...'),
            ],
          ),
        ),
      ),
      error: (_, _) => const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text(
            'Data masjid belum bisa dimuat.',
            style: TextStyle(
              color: AppTheme.ink500,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
      data: (items) {
        if (items.isEmpty) {
          return const Card(
            key: Key('prayer-mosques-empty'),
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Belum ada data masjid/meunasah dari admin.',
                style: TextStyle(
                  color: AppTheme.ink500,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          );
        }

        return Column(
          key: const Key('prayer-mosques-list'),
          children: [
            for (final mosque in items) ...[
              _MosqueCard(mosque: mosque),
              if (mosque != items.last) const SizedBox(height: 10),
            ],
          ],
        );
      },
    );
  }
}

class _MosqueCard extends StatelessWidget {
  const _MosqueCard({required this.mosque});

  final Mosque mosque;

  @override
  Widget build(BuildContext context) {
    final hasImage = mosque.photoUrl != null && mosque.photoUrl!.isNotEmpty;
    final locationText = mosque.landmark == null || mosque.landmark!.isEmpty
        ? mosque.address
        : '${mosque.address} · ${mosque.landmark}';

    return Card(
      key: Key('mosque-card-${mosque.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            child: hasImage
                ? CachedApiImage(
                    url: mosque.photoUrl,
                    cacheKey: mosque.photoFileId,
                    height: 120,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    fallback: const _MosqueImageFallback(),
                  )
                : const _MosqueImageFallback(),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  mosque.name,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: 14,
                      color: AppTheme.ink500,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        locationText,
                        style: const TextStyle(
                          color: AppTheme.ink500,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MosqueImageFallback extends StatelessWidget {
  const _MosqueImageFallback();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 120,
      width: double.infinity,
      color: AppTheme.g100,
      child: const Icon(Icons.mosque_outlined, size: 48, color: AppTheme.g400),
    );
  }
}

// ── Countdown card ────────────────────────────────────────────────────────────

class _CountdownCard extends StatelessWidget {
  const _CountdownCard({required this.activePrayer, required this.prayerTimes});

  final String? activePrayer;
  final PrayerTimes prayerTimes;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final hijriDate = _approximateHijri(now);
    final countdown = _countdown(activePrayer ?? 'Subuh', prayerTimes);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.g800,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            hijriDate,
            style: const TextStyle(
              color: Color(0xFFCDEBDD),
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                countdown.$1,
                style: const TextStyle(
                  color: AppTheme.gold500,
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(width: 10),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  'menuju ${countdown.$2}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static (String, String) _countdown(String active, PrayerTimes times) {
    final schedule = [
      ('Subuh', times.subuh),
      ('Dhuhur', times.dhuhur),
      ('Ashar', times.ashar),
      ('Maghrib', times.maghrib),
      ('Isya', times.isya),
    ];

    final now = TimeOfDay.now();
    final nowMins = now.hour * 60 + now.minute;

    for (final entry in schedule) {
      final parts = entry.$2.split(':');
      final entryMins = int.parse(parts[0]) * 60 + int.parse(parts[1]);
      if (entryMins > nowMins) {
        final diff = entryMins - nowMins;
        final h = diff ~/ 60;
        final m = diff % 60;
        final timeStr = h > 0
            ? '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}'
            : '00:${m.toString().padLeft(2, '0')}';
        return (timeStr, entry.$1);
      }
    }

    return ('00:00', 'Isya');
  }

  static String _approximateHijri(DateTime date) {
    final months = [
      'Muharram',
      'Safar',
      "Rabi'ul Awal",
      "Rabi'ul Akhir",
      'Jumadil Awal',
      'Jumadil Akhir',
      'Rajab',
      "Sya'ban",
      'Ramadan',
      'Syawal',
      "Dzul Qa'dah",
      'Dzul Hijjah',
    ];
    final epoch = DateTime(622, 7, 16);
    final daysSinceEpoch = date.difference(epoch).inDays;
    final hijriYear = 1 + (daysSinceEpoch / 354.37).floor();
    final monthIndex = ((date.month + 8) % 12);
    return '${date.day} ${months[monthIndex]} $hijriYear H';
  }
}

// ── Source card ───────────────────────────────────────────────────────────────

class _PrayerSourceCard extends StatelessWidget {
  const _PrayerSourceCard({
    required this.loading,
    required this.prayerTimes,
    required this.onRefresh,
    this.errorMessage,
  });

  final bool loading;
  final PrayerTimes prayerTimes;
  final VoidCallback onRefresh;
  final String? errorMessage;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: AppTheme.g50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    prayerTimes.fromFallback
                        ? Icons.schedule_outlined
                        : Icons.my_location,
                    color: AppTheme.villageGreen,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Sumber Jadwal',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppTheme.ink900,
                        ),
                      ),
                      Text(
                        prayerTimes.sourceLabel,
                        key: const Key('prayer-source-label'),
                        style: const TextStyle(
                          color: AppTheme.ink500,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (prayerTimes.latitude != null &&
                prayerTimes.longitude != null) ...[
              const SizedBox(height: 10),
              Text(
                'Lokasi: ${prayerTimes.latitude!.toStringAsFixed(4)}, '
                '${prayerTimes.longitude!.toStringAsFixed(4)}',
                style: const TextStyle(
                  color: AppTheme.ink500,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            if (errorMessage != null) ...[
              const SizedBox(height: 10),
              Text(
                errorMessage!,
                key: const Key('prayer-error-text'),
                style: const TextStyle(
                  color: Color(0xFF9A3412),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            const SizedBox(height: 12),
            FilledButton.icon(
              key: const Key('prayer-use-gps'),
              onPressed: loading ? null : onRefresh,
              icon: loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.gps_fixed),
              label: Text(
                loading ? 'Mengambil lokasi...' : 'Gunakan GPS & Internet',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

String? _activePrayer(PrayerTimes times) {
  final now = TimeOfDay.now();
  final schedule = [
    ('Subuh', times.subuh),
    ('Dhuhur', times.dhuhur),
    ('Ashar', times.ashar),
    ('Maghrib', times.maghrib),
    ('Isya', times.isya),
  ];

  String? active;
  for (final entry in schedule) {
    final prayerTime = _parseTime(entry.$2);
    if (_minutes(prayerTime) <= _minutes(now)) active = entry.$1;
  }
  return active;
}

TimeOfDay _parseTime(String time) {
  final parts = time.split(':');
  return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
}

int _minutes(TimeOfDay time) => time.hour * 60 + time.minute;

class _PrayerRow extends StatelessWidget {
  const _PrayerRow(this.name, this.time, {this.active = false});

  final String name;
  final String time;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: active ? AppTheme.g800 : Colors.white,
      child: ListTile(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (active)
              const Text(
                'Waktu sekarang',
                style: TextStyle(
                  fontSize: 10,
                  color: AppTheme.g300,
                  fontWeight: FontWeight.w600,
                ),
              ),
            Text(
              name,
              style: TextStyle(
                color: active ? Colors.white : AppTheme.ink700,
                fontWeight: FontWeight.w800,
                fontSize: 15,
              ),
            ),
          ],
        ),
        trailing: Text(
          '$time WIB',
          style: TextStyle(
            color: active ? AppTheme.gold500 : AppTheme.ink900,
            fontWeight: FontWeight.w800,
            fontSize: 16,
          ),
        ),
      ),
    );
  }
}
