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
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Surat Keterangan Miskin',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text('Status: Sedang diproses'),
                  ],
                ),
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
              title: 'Ditinjau petugas',
              subtitle: 'Sedang diproses',
            ),
            const _TimelineStep(
              done: false,
              title: 'Surat dibuat & ditandatangani',
              subtitle: 'Menunggu persetujuan Keuchik',
            ),
            const _TimelineStep(
              done: false,
              title: 'Surat dikirim ke email',
              subtitle: 'Menunggu',
            ),
          ],
        ],
      ),
    );
  }
}

class _TimelineStep extends StatelessWidget {
  const _TimelineStep({
    required this.done,
    required this.title,
    required this.subtitle,
  });

  final bool done;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Icon(
              done ? Icons.check_circle : Icons.radio_button_unchecked,
              color: done ? AppTheme.villageGreen : const Color(0xFFB7BEB9),
            ),
            Container(width: 2, height: 48, color: const Color(0xFFE2E7E3)),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(color: Color(0xFF667069)),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
