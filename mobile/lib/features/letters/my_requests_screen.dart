import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';

class MyRequestsScreen extends StatelessWidget {
  const MyRequestsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Permohonan Saya',
      subtitle: 'Riwayat permohonan surat',
      leading: const SapaBackButton(),
      body: ListView(
        children: const [
          _RequestCard(
            code: 'BLG-2K7F9',
            letterType: 'Surat Keterangan Miskin',
            date: '18 Jul 2026',
            status: 'Ditinjau',
            statusBg: AppTheme.warnBg,
            statusColor: AppTheme.warn,
          ),
          SizedBox(height: 10),
          _RequestCard(
            code: 'BLG-1A3C2',
            letterType: 'Surat Keterangan Domisili',
            date: '10 Jul 2026',
            status: 'Terkirim',
            statusBg: AppTheme.okBg,
            statusColor: AppTheme.ok,
            showDownload: true,
          ),
          SizedBox(height: 10),
          _RequestCard(
            code: 'BLG-9X4B1',
            letterType: 'Surat Keterangan Usaha',
            date: '02 Jul 2026',
            status: 'Perlu Perbaikan',
            statusBg: AppTheme.warnBg,
            statusColor: AppTheme.warn,
            showReupload: true,
          ),
          SizedBox(height: 10),
          _RequestCard(
            code: 'BLG-7M5D8',
            letterType: 'Surat Rekomendasi',
            date: '25 Jun 2026',
            status: 'Ditolak',
            statusBg: AppTheme.dangerBg,
            statusColor: AppTheme.danger,
          ),
        ],
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.code,
    required this.letterType,
    required this.date,
    required this.status,
    required this.statusBg,
    required this.statusColor,
    this.showDownload = false,
    this.showReupload = false,
  });

  final String code;
  final String letterType;
  final String date;
  final String status;
  final Color statusBg;
  final Color statusColor;
  final bool showDownload;
  final bool showReupload;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    code,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    status,
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              letterType,
              style: const TextStyle(color: AppTheme.ink500),
            ),
            const SizedBox(height: 4),
            Text(
              'Diajukan $date',
              style: const TextStyle(fontSize: 12, color: AppTheme.ink300),
            ),
            if (showReupload) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.warnBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.warning_amber_outlined,
                        size: 16, color: AppTheme.warn),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Lampiran perlu diperbaiki. Unggah ulang untuk melanjutkan.',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.warn,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.upload_file_outlined, size: 18),
                  label: const Text('Unggah Ulang Lampiran'),
                ),
              ),
            ],
            if (showDownload) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.download_outlined, size: 18),
                  label: const Text('Unduh Surat (PDF)'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
