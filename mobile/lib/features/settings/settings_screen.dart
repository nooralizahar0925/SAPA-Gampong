import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/config/env.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/contact_actions.dart';
import '../../core/widgets/resident_email_gate.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/providers/app_preferences_providers.dart';
import '../../data/providers/content_providers.dart';
import '../../data/services/notification_service.dart';
import '../../data/services/prayer_times_service.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  @override
  Widget build(BuildContext context) {
    final preferences = ref.watch(appPreferencesProvider);
    final values = preferences.value;
    final profile = ref.watch(villageProfileProvider).asData?.value;
    final contactPhone = resolveOfficePhone(profile?.contactPhone);

    return SapaScaffold(
      title: 'Pengaturan',
      subtitle: 'Preferensi aplikasi',
      selectedIndex: 3,
      body: ListView(
        children: [
          const SectionTitle('Notifikasi'),
          _SettingsSwitch(
            value: values?.adzanAlarmEnabled ?? false,
            onChanged: (v) => unawaited(_setAzanAlarm(v)),
            title: 'Alarm Azan',
            subtitle: 'Pengingat lokal untuk lima waktu sholat',
          ),
          _SettingsSwitch(
            value: values?.letterStatusNotifications ?? true,
            onChanged: (v) => unawaited(_setLetterStatusNotifications(v)),
            title: 'Status Permohonan Surat',
            subtitle: 'Pemberitahuan untuk semua proses surat',
          ),
          _SettingsSwitch(
            value: values?.feedbackStatusNotifications ?? true,
            onChanged: (v) => unawaited(_setFeedbackStatusNotifications(v)),
            title: 'Status Laporan Warga',
            subtitle: 'Pemberitahuan untuk proses laporan warga',
          ),
          _SettingsSwitch(
            value: values?.villageAnnouncements ?? false,
            onChanged: null,
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
            icon: Icons.inbox_outlined,
            title: 'Permohonan Saya',
            subtitle: 'Riwayat surat berdasarkan email tersimpan',
            onTap: () => context.pushNamed(AppRouteNames.myRequests),
          ),
          SapaListTile(
            icon: Icons.campaign_outlined,
            title: 'Laporan Saya',
            subtitle: 'Riwayat pelaporan berdasarkan email tersimpan',
            onTap: () => context.pushNamed(AppRouteNames.myFeedback),
          ),
          const ResidentEmailSummary(),
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
            subtitle: contactPhone,
            onTap: () => showOfficeContactActions(context, contactPhone),
          ),
          SapaListTile(
            icon: Icons.info_outline,
            title: 'Tentang Aplikasi',
            subtitle: 'Gampong Blang Digital · Versi 1.0.0',
            trailing: const SizedBox.shrink(),
            onTap: () {},
          ),
          SapaListTile(
            icon: Icons.privacy_tip_outlined,
            title: 'Privasi & Penghapusan Data',
            subtitle: 'Baca kebijakan atau ajukan penghapusan data',
            onTap: () => unawaited(
              openExternalWebsite(context, Env.privacyPolicyUrl),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _setAzanAlarm(bool enabled) async {
    final notifier = ref.read(appPreferencesProvider.notifier);
    final notifications = ref.read(notificationServiceProvider);

    if (!enabled) {
      await notifier.setAdzanAlarmEnabled(false);
      await notifications.cancel();
      return;
    }

    try {
      final config = await ref.read(prayerConfigProvider.future);
      final adzanUrl = config.adzanUrl;
      if (adzanUrl == null || adzanUrl.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Audio azan belum dikonfigurasi oleh admin gampong.'),
          ),
        );
        await notifier.setAdzanAlarmEnabled(false);
        return;
      }

      await notifications.scheduleDaily(
        prayerTimes: PrayerTimes.fromConfigFallback(config),
        adzanUrl: adzanUrl,
      );
      await notifier.setAdzanAlarmEnabled(true);

      if (!mounted) return;
      final next = notifications.lastSchedule;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            next == null
                ? 'Alarm azan aktif.'
                : 'Alarm azan aktif untuk ${next.prayerName}.',
          ),
        ),
      );
    } on AdzanAlarmPermissionException catch (error) {
      await notifier.setAdzanAlarmEnabled(false);
      await notifications.cancel();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    } catch (error, stackTrace) {
      debugPrint('Failed to enable adzan alarm: $error');
      debugPrintStack(stackTrace: stackTrace);
      await notifier.setAdzanAlarmEnabled(false);
      await notifications.cancel();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Alarm azan belum bisa diaktifkan. Coba lagi nanti.'),
        ),
      );
    }
  }

  Future<void> _setLetterStatusNotifications(bool enabled) async {
    final notifier = ref.read(appPreferencesProvider.notifier);
    await notifier.setLetterStatusNotifications(enabled);
    await _syncPushPreferences();
  }

  Future<void> _setFeedbackStatusNotifications(bool enabled) async {
    final notifier = ref.read(appPreferencesProvider.notifier);
    await notifier.setFeedbackStatusNotifications(enabled);
    await _syncPushPreferences();
  }

  Future<void> _syncPushPreferences() async {
    try {
      final preferences = await ref.read(appPreferencesProvider.future);
      await ref
          .read(notificationServiceProvider)
          .syncDevicePreferences(preferences);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Preferensi notifikasi tersimpan, sinkron saat online.',
          ),
        ),
      );
    }
  }
}

class _SettingsSwitch extends StatelessWidget {
  const _SettingsSwitch({
    required this.value,
    this.onChanged,
    required this.title,
    required this.subtitle,
  });

  final bool value;
  final ValueChanged<bool>? onChanged;
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
