import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/mock/village_seed.dart';

class VerificationScreen extends StatelessWidget {
  const VerificationScreen({super.key});

  static const _verifyUrl = 'blang.desa.id/verify/8f2c…a19d';

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Verifikasi Keaslian Surat',
      subtitle: 'Pindai QR pada surat',
      leading: const SapaBackButton(),
      body: ListView(
        children: [
          // Verified alert
          const Card(
            color: AppTheme.okBg,
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.verified, color: AppTheme.ok, size: 36),
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
          const SizedBox(height: 16),
          // QR code placeholder
          Center(
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: AppTheme.line, width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const _QrPlaceholder(),
            ),
          ),
          const SizedBox(height: 10),
          Center(
            child: Text(
              _verifyUrl,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.ink500,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SectionTitle('Detail Surat'),
          const _VerifyRow('Nomor Surat', '400.10.4.4/017/2026'),
          const _VerifyRow('Jenis Surat', 'Surat Keterangan Miskin'),
          const _VerifyRow('Tanggal Terbit', '20 Juli 2026'),
          const _VerifyRow('Penandatangan', '$keuchikName — Keuchik Gampong Blang'),
          const _VerifyRow('Perihal', 'a.n. R*** (NIK 1607********0001)'),
          const SizedBox(height: 14),
          const FilledButton(onPressed: null, child: Text('Unduh Surat (PDF)')),
        ],
      ),
    );
  }
}

class _QrPlaceholder extends StatelessWidget {
  const _QrPlaceholder();

  @override
  Widget build(BuildContext context) {
    // Visual QR-like grid placeholder until qr_flutter is added
    return CustomPaint(
      painter: _QrGridPainter(),
      size: const Size(160, 160),
    );
  }
}

class _QrGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppTheme.ink900
      ..style = PaintingStyle.fill;

    final cell = size.width / 10;

    // Simple QR-like corner squares pattern
    final corners = [
      Rect.fromLTWH(cell, cell, cell * 3, cell * 3),
      Rect.fromLTWH(cell * 6, cell, cell * 3, cell * 3),
      Rect.fromLTWH(cell, cell * 6, cell * 3, cell * 3),
    ];
    for (final rect in corners) {
      canvas.drawRect(rect, paint);
      canvas.drawRect(
        rect.deflate(cell * 0.6),
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.fill,
      );
      canvas.drawRect(rect.deflate(cell), paint);
    }

    // Random data cells simulation
    final cells = [
      [5, 2], [6, 2], [5, 4], [7, 3], [5, 5], [8, 5],
      [5, 6], [7, 7], [6, 8], [8, 8], [5, 9], [7, 9],
    ];
    for (final c in cells) {
      canvas.drawRect(
        Rect.fromLTWH(c[0] * cell, c[1] * cell, cell * 0.8, cell * 0.8),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_QrGridPainter oldDelegate) => false;
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
            Expanded(
              child: Text(
                label,
                style: const TextStyle(color: AppTheme.ink500),
              ),
            ),
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
