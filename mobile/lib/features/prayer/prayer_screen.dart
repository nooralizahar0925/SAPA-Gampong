import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';

class PrayerScreen extends StatefulWidget {
  const PrayerScreen({super.key});

  @override
  State<PrayerScreen> createState() => _PrayerScreenState();
}

class _PrayerScreenState extends State<PrayerScreen> {
  bool alarmOn = false;

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Jadwal Sholat',
      subtitle: 'Gampong Blang · WIB',
      leading: const SapaBackButton(),
      body: ListView(
        children: [
          const Text(
            'Senin, 20 Juli 2026',
            style: TextStyle(
              color: Color(0xFF667069),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          const _PrayerRow('Subuh', '04:58'),
          const _PrayerRow('Dhuhur · sekarang', '12:31', active: true),
          const _PrayerRow('Ashar', '15:52'),
          const _PrayerRow('Maghrib', '18:38'),
          const _PrayerRow('Isya', '19:49'),
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
}

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
