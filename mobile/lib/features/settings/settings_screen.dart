import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool azanAlarm = true;
  bool letterStatus = true;
  bool villageAnnouncements = false;

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Pengaturan',
      subtitle: 'Preferensi aplikasi',
      selectedIndex: 3,
      body: ListView(
        children: [
          const SectionTitle('Notifikasi'),
          _SettingsSwitch(
            value: azanAlarm,
            onChanged: (v) => setState(() => azanAlarm = v),
            title: 'Alarm Azan',
            subtitle: 'Pengingat lokal untuk lima waktu sholat',
          ),
          _SettingsSwitch(
            value: letterStatus,
            onChanged: (v) => setState(() => letterStatus = v),
            title: 'Status Permohonan Surat',
            subtitle: 'Pemberitahuan saat surat disetujui / dikirim',
          ),
          _SettingsSwitch(
            value: villageAnnouncements,
            onChanged: (v) => setState(() => villageAnnouncements = v),
            title: 'Pengumuman Gampong',
            subtitle: 'Info dan berita dari kantor keuchik',
          ),
          const SectionTitle('Permohonan'),
          SapaListTile(
            icon: Icons.manage_search_outlined,
            title: 'Lacak dengan Kode',
            subtitle: 'Masukkan kode BLG-xxxxx',
            onTap: () => context.pushNamed(AppRouteNames.tracking),
          ),
          SapaListTile(
            icon: Icons.mail_outline,
            title: 'Email Tersimpan',
            subtitle: 'asra.roniasra@gmail.com',
            onTap: () {},
          ),
          const SectionTitle('Aplikasi'),
          SapaListTile(
            icon: Icons.language_outlined,
            title: 'Bahasa',
            subtitle: 'Bahasa Indonesia',
            onTap: () {},
          ),
          SapaListTile(
            icon: Icons.phone_outlined,
            title: 'Hubungi Kantor Keuchik',
            subtitle: '+62 813-6000-0000',
            onTap: () {},
          ),
          SapaListTile(
            icon: Icons.info_outline,
            title: 'Tentang Aplikasi',
            subtitle: 'SAPA Gampong · Versi 1.0.0',
            trailing: const SizedBox.shrink(),
            onTap: () {},
          ),
        ],
      ),
    );
  }
}

class _SettingsSwitch extends StatelessWidget {
  const _SettingsSwitch({
    required this.value,
    required this.onChanged,
    required this.title,
    required this.subtitle,
  });

  final bool value;
  final ValueChanged<bool> onChanged;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: SwitchListTile(
        value: value,
        onChanged: onChanged,
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text(subtitle),
        activeThumbColor: AppTheme.villageGreen,
      ),
    );
  }
}
