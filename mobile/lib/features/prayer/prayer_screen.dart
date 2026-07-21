import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/services/prayer_times_service.dart';

class PrayerScreen extends StatefulWidget {
  const PrayerScreen({super.key});

  @override
  State<PrayerScreen> createState() => _PrayerScreenState();
}

class _PrayerScreenState extends State<PrayerScreen> {
  final PrayerTimesService _service = PrayerTimesService();

  bool alarmOn = false;
  bool loading = false;
  String? errorMessage;
  PrayerTimes prayerTimes = PrayerTimes.fallback();

  Future<void> _loadFromGps() async {
    if (loading) return;

    setState(() {
      loading = true;
      errorMessage = null;
    });

    try {
      final nextTimes = await _service.fetchUsingGps();
      if (!mounted) return;

      setState(() {
        prayerTimes = nextTimes;
        loading = false;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        errorMessage = _friendlyError(error);
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final activePrayer = _activePrayer(prayerTimes);

    return SapaScaffold(
      title: 'Jadwal Sholat',
      subtitle: 'Gampong Blang · WIB',
      leading: const SapaBackButton(),
      body: ListView(
        children: [
          // Countdown card
          _CountdownCard(activePrayer: activePrayer, prayerTimes: prayerTimes),
          const SizedBox(height: 14),
          _PrayerRow(
            'Subuh',
            prayerTimes.subuh,
            active: activePrayer == 'Subuh',
          ),
          _PrayerRow(
            'Dhuhur',
            prayerTimes.dhuhur,
            active: activePrayer == 'Dhuhur',
          ),
          _PrayerRow(
            'Ashar',
            prayerTimes.ashar,
            active: activePrayer == 'Ashar',
          ),
          _PrayerRow(
            'Maghrib',
            prayerTimes.maghrib,
            active: activePrayer == 'Maghrib',
          ),
          _PrayerRow(
            'Isya',
            prayerTimes.isya,
            active: activePrayer == 'Isya',
          ),
          const SizedBox(height: 12),
          Card(
            color: AppTheme.deepGreen,
            child: SwitchListTile(
              value: alarmOn,
              onChanged: (value) => setState(() => alarmOn = value),
              title: const Text(
                'Aktifkan Alarm Suara Azan',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                ),
              ),
              subtitle: const Text(
                'Pengingat lokal di perangkat',
                style: TextStyle(color: Color(0xFFCDEBDD)),
              ),
            ),
          ),
          const SizedBox(height: 12),
          // GPS source card
          if (!prayerTimes.fromFallback || errorMessage != null)
            _PrayerSourceCard(
              loading: loading,
              prayerTimes: prayerTimes,
              errorMessage: errorMessage,
              onRefresh: _loadFromGps,
            ),
          if (prayerTimes.fromFallback && errorMessage == null)
            _PrayerSourceCard(
              loading: loading,
              prayerTimes: prayerTimes,
              errorMessage: null,
              onRefresh: _loadFromGps,
            ),
          const SectionTitle('Masjid & Meunasah'),
          // Mosque card with image placeholder
          Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(12),
                  ),
                  child: Container(
                    height: 120,
                    width: double.infinity,
                    color: AppTheme.g100,
                    child: const Icon(
                      Icons.mosque_outlined,
                      size: 48,
                      color: AppTheme.g400,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        "Masjid Jami' Baitul Makmur",
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                      SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(
                            Icons.location_on_outlined,
                            size: 14,
                            color: AppTheme.ink500,
                          ),
                          SizedBox(width: 4),
                          Text(
                            'Gampong Blang · Pusat gampong',
                            style: TextStyle(
                              color: AppTheme.ink500,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _friendlyError(Object error) {
    if (error is LocationPermissionException) {
      return error.message;
    }

    return 'Belum bisa mengambil jadwal dari GPS/internet. Data contoh tetap ditampilkan.';
  }
}

class _CountdownCard extends StatelessWidget {
  const _CountdownCard({
    required this.activePrayer,
    required this.prayerTimes,
  });

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
      final entryMins =
          int.parse(parts[0]) * 60 + int.parse(parts[1]);
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
    // Rough Hijri approximation for display
    final months = [
      'Muharram', 'Safar', "Rabi'ul Awal", "Rabi'ul Akhir",
      'Jumadil Awal', 'Jumadil Akhir', 'Rajab', "Sya'ban",
      'Ramadan', 'Syawal', "Dzul Qa'dah", 'Dzul Hijjah',
    ];
    final epoch = DateTime(622, 7, 16);
    final daysSinceEpoch = date.difference(epoch).inDays;
    final hijriYear = 1 + (daysSinceEpoch / 354.37).floor();
    final monthIndex = ((date.month + 8) % 12);
    return '${date.day} ${months[monthIndex]} $hijriYear H';
  }
}

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
            if (prayerTimes.latitude != null && prayerTimes.longitude != null)
              ...[
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

// Returns null before Subuh (no prayer is "sekarang" yet today)
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
    if (_minutes(prayerTime) <= _minutes(now)) {
      active = entry.$1;
    }
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
