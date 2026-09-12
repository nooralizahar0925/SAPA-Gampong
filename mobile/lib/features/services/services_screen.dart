import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/letter_type.dart';
import '../../data/providers/letter_providers.dart';

class ServicesScreen extends ConsumerWidget {
  const ServicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final letterTypes = ref.watch(letterTypesProvider);

    return SapaScaffold(
      title: 'Layanan',
      subtitle: 'Administrasi dan informasi warga',
      selectedIndex: 1,
      body: ListView(
        children: [
          const SectionTitle('Administrasi Surat'),
          SapaListTile(
            key: const Key('service-letter-request'),
            icon: Icons.description_outlined,
            title: 'Permohonan Pembuatan Surat',
            subtitle: letterTypeCountLabel(
              letterTypes,
              suffix: 'surat keterangan',
            ),
            onTap: () => context.pushNamed(AppRouteNames.letterCatalog),
          ),
          SapaListTile(
            key: const Key('service-tracking'),
            icon: Icons.manage_search_outlined,
            title: 'Lacak Permohonan',
            subtitle: 'Cek status dengan kode',
            onTap: () => context.pushNamed(AppRouteNames.tracking),
          ),
          SapaListTile(
            key: const Key('service-verify'),
            icon: Icons.verified_outlined,
            title: 'Verifikasi Keaslian Surat',
            subtitle: 'Pindai QR pada surat',
            onTap: () => context.pushNamed(AppRouteNames.verify),
          ),
          const SectionTitle('Informasi Desa'),
          SapaListTile(
            key: const Key('service-profile'),
            icon: Icons.account_balance_outlined,
            title: 'Profil Desa',
            subtitle: 'Sejarah, visi & misi, perangkat',
            onTap: () => context.pushNamed(AppRouteNames.profile),
          ),
          SapaListTile(
            key: const Key('service-demographics'),
            icon: Icons.bar_chart_outlined,
            title: 'Demografi',
            subtitle: 'Statistik penduduk umum',
            onTap: () => context.pushNamed(AppRouteNames.demographics),
          ),
          SapaListTile(
            key: const Key('service-gallery'),
            icon: Icons.photo_library_outlined,
            title: 'Galeri',
            subtitle: 'Foto dan video kegiatan gampong',
            onTap: () => context.pushNamed(AppRouteNames.gallery),
          ),
          SapaListTile(
            key: const Key('service-prayer'),
            icon: Icons.access_time_outlined,
            title: 'Jadwal Sholat',
            subtitle: 'Waktu sholat & alarm azan',
            onTap: () => context.pushNamed(AppRouteNames.prayer),
          ),
          const SectionTitle('Aspirasi'),
          SapaListTile(
            key: const Key('service-feedback'),
            icon: Icons.campaign_outlined,
            title: 'Pelaporan / Aspirasi',
            subtitle: 'Kirim laporan ke kantor keuchik',
            onTap: () => context.pushNamed(AppRouteNames.feedback),
          ),
        ],
      ),
    );
  }
}

String letterTypeCountLabel(
  AsyncValue<List<LetterType>> value, {
  required String suffix,
}) {
  return value.maybeWhen(
    data: (types) => '${types.length} jenis $suffix',
    orElse: () => 'Memuat jenis $suffix',
  );
}
