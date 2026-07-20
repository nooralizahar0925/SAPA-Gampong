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
          Text(
            MaterialLocalizations.of(context).formatFullDate(DateTime.now()),
            style: const TextStyle(
              color: Color(0xFF667069),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          _PrayerSourceCard(
            loading: loading,
            prayerTimes: prayerTimes,
            errorMessage: errorMessage,
            onRefresh: _loadFromGps,
          ),
          const SizedBox(height: 12),
          _PrayerRow(
            _rowName('Subuh', activePrayer),
            prayerTimes.subuh,
            active: activePrayer == 'Subuh',
          ),
          _PrayerRow(
            _rowName('Dhuhur', activePrayer),
            prayerTimes.dhuhur,
            active: activePrayer == 'Dhuhur',
          ),
          _PrayerRow(
            _rowName('Ashar', activePrayer),
            prayerTimes.ashar,
            active: activePrayer == 'Ashar',
          ),
          _PrayerRow(
            _rowName('Maghrib', activePrayer),
            prayerTimes.maghrib,
            active: activePrayer == 'Maghrib',
          ),
          _PrayerRow(
            _rowName('Isya', activePrayer),
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
          const SectionTitle('Masjid & Meunasah'),
          SapaListTile(
            icon: Icons.mosque_outlined,
            title: "Masjid Jami' Baitul Makmur",
            subtitle: 'Alamat: Gampong Blang · Patokan: pusat gampong',
            trailing: const SizedBox.shrink(),
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
                    color: const Color(0xFFEEF6F1),
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
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF131A17),
                        ),
                      ),
                      Text(
                        prayerTimes.sourceLabel,
                        style: const TextStyle(
                          color: Color(0xFF667069),
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
                  color: Color(0xFF667069),
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

String _rowName(String name, String activePrayer) {
  if (name == activePrayer) {
    return '$name · sekarang';
  }

  return name;
}

String _activePrayer(PrayerTimes times) {
  final now = TimeOfDay.now();
  final schedule = [
    ('Subuh', times.subuh),
    ('Dhuhur', times.dhuhur),
    ('Ashar', times.ashar),
    ('Maghrib', times.maghrib),
    ('Isya', times.isya),
  ];

  var active = schedule.first.$1;
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
      color: active ? const Color(0xFFEEF6F1) : Colors.white,
      child: ListTile(
        title: Text(
          name,
          style: TextStyle(
            color: active ? AppTheme.villageGreen : const Color(0xFF37423C),
            fontWeight: active ? FontWeight.w900 : FontWeight.w600,
          ),
        ),
        trailing: Text(
          '$time WIB',
          style: TextStyle(
            color: active ? AppTheme.villageGreen : const Color(0xFF131A17),
            fontWeight: FontWeight.w900,
            fontSize: 16,
          ),
        ),
      ),
    );
  }
}
