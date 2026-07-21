import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';

class TrackingScreen extends StatefulWidget {
  const TrackingScreen({super.key});

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  final controller = TextEditingController(text: 'BLG-2K7F9');
  bool searched = true;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Lacak Permohonan',
      subtitle: searched ? controller.text : 'Masukkan kode',
      leading: const SapaBackButton(),
      body: ListView(
        children: [
          TextField(
            controller: controller,
            decoration: InputDecoration(
              labelText: 'Kode Permohonan',
              suffixIcon: IconButton(
                onPressed: () => setState(() => searched = true),
                icon: const Icon(Icons.search),
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (searched) ...[
            // Summary card with status badge
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            controller.text,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppTheme.warnBg,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: const Text(
                            'Sedang Ditinjau',
                            style: TextStyle(
                              color: AppTheme.warn,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Surat Keterangan Miskin',
                      style: TextStyle(color: AppTheme.ink500),
                    ),
                  ],
                ),
              ),
            ),
            // Email info alert
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.g50,
                border: Border.all(color: AppTheme.g300),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                children: [
                  Icon(Icons.mail_outline, size: 16, color: AppTheme.g700),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Surat jadi akan dikirim ke asra.roniasra@gmail.com',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.g700,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SectionTitle('Riwayat Status'),
            const _TimelineStep(
              done: true,
              title: 'Permohonan diajukan',
              subtitle: '18 Jul 2026 · 09.41 WIB',
            ),
            const _TimelineStep(
              done: true,
              title: 'Diterima di kantor keuchik',
              subtitle: '18 Jul 2026 · 11.00 WIB',
            ),
            const _TimelineStep(
              isNow: true,
              title: 'Ditinjau petugas',
              subtitle: 'Sedang dalam peninjauan',
            ),
            const _TimelineStep(
              title: 'Disetujui Keuchik',
              subtitle: 'Menunggu persetujuan',
            ),
            const _TimelineStep(
              title: 'Surat dibuat & ditandatangani',
              subtitle: 'Menunggu',
            ),
            const _TimelineStep(
              title: 'Surat dikirim ke email',
              subtitle: 'Menunggu',
              isLast: true,
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.phone_outlined, size: 18),
              label: const Text('Hubungi Kantor Keuchik'),
            ),
          ],
        ],
      ),
    );
  }
}

class _TimelineStep extends StatelessWidget {
  const _TimelineStep({
    this.done = false,
    this.isNow = false,
    this.isLast = false,
    required this.title,
    required this.subtitle,
  });

  final bool done;
  final bool isNow;
  final bool isLast;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final Color dotColor = isNow
        ? AppTheme.gold500
        : done
            ? AppTheme.villageGreen
            : AppTheme.ink300;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: isNow
                    ? AppTheme.warnBg
                    : done
                        ? AppTheme.okBg
                        : AppTheme.g50,
                shape: BoxShape.circle,
                border: Border.all(color: dotColor, width: 2),
              ),
              child: isNow || done
                  ? Icon(
                      isNow ? Icons.access_time : Icons.check,
                      size: 12,
                      color: dotColor,
                    )
                  : null,
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 48,
                color: done ? AppTheme.g300 : AppTheme.line,
              ),
          ],
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 2, bottom: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: isNow ? AppTheme.ink900 : AppTheme.ink700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: isNow ? AppTheme.warn : AppTheme.ink500,
                    fontWeight: isNow ? FontWeight.w600 : FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
