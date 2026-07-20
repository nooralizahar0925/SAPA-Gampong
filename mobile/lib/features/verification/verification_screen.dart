import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/mock/village_seed.dart';

class VerificationScreen extends StatelessWidget {
  const VerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Verifikasi Keaslian Surat',
      subtitle: 'Pindai QR pada surat',
      leading: const BackButton(),
      body: ListView(
        children: const [
          Card(
            color: Color(0xFFD7EEE3),
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.verified, color: AppTheme.villageGreen, size: 36),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Surat TERVERIFIKASI\nDiterbitkan secara sah oleh Pemerintah Gampong Blang.',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SectionTitle('Detail Surat'),
          _VerifyRow('Nomor Surat', '400.10.4.4/017/2026'),
          _VerifyRow('Jenis Surat', 'Surat Keterangan Miskin'),
          _VerifyRow('Tanggal Terbit', '20 Juli 2026'),
          _VerifyRow('Penandatangan', '$keuchikName — Keuchik Gampong Blang'),
          _VerifyRow('Perihal', 'a.n. R*** (NIK 1607********0001)'),
          SizedBox(height: 14),
          FilledButton(onPressed: null, child: Text('Unduh Surat (PDF)')),
        ],
      ),
    );
  }
}

class _VerifyRow extends StatelessWidget {
  const _VerifyRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Expanded(child: Text(label)),
            Expanded(
              child: Text(
                value,
                textAlign: TextAlign.right,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
