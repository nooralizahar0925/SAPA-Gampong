import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/widgets/sapa_scaffold.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool letterStatus = true;
  bool azanAlarm = false;

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Pengaturan',
      subtitle: 'Preferensi aplikasi',
      selectedIndex: 3,
      body: ListView(
        children: [
          const SectionTitle('Notifikasi'),
          SwitchListTile(
            value: letterStatus,
            onChanged: (value) => setState(() => letterStatus = value),
            title: const Text('Status Permohonan Surat'),
            subtitle: const Text(
              'Pemberitahuan saat surat disetujui / dikirim',
            ),
          ),
          SwitchListTile(
            value: azanAlarm,
            onChanged: (value) => setState(() => azanAlarm = value),
            title: const Text('Alarm Suara Azan'),
            subtitle: const Text('Pengingat lokal untuk lima waktu sholat'),
          ),
          const SectionTitle('Permohonan'),
          SapaListTile(
            icon: Icons.manage_search_outlined,
            title: 'Lacak dengan Kode',
            subtitle: 'Masukkan kode BLG-xxxxx',
            onTap: () => context.pushNamed(AppRouteNames.tracking),
          ),
          const SectionTitle('Aplikasi'),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'SAPA Gampong · Sistem Administrasi & Pelayanan Gampong Blang\nVersi 1.0.0',
              ),
            ),
          ),
        ],
      ),
    );
  }
}
