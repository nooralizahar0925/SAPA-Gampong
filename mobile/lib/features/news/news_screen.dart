import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';

class NewsScreen extends StatelessWidget {
  const NewsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Berita',
      subtitle: 'Kabar dan pengumuman gampong',
      selectedIndex: 2,
      body: ListView(
        children: [
          const SizedBox(height: 32),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                children: [
                  Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      color: AppTheme.gold500,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(
                      Icons.article_outlined,
                      size: 34,
                      color: AppTheme.ink900,
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Belum ada berita',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Kabar dan pengumuman dari Pemerintah Gampong Blang akan tampil di sini. Nantikan pembaruan berikutnya.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppTheme.ink700, height: 1.55),
                  ),
                  const SizedBox(height: 22),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.fieldSurface,
                      border: Border.all(color: AppTheme.gold500),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.build_circle_outlined,
                          size: 16,
                          color: AppTheme.g700,
                        ),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Halaman berita sedang dikembangkan. Informasi resmi akan ditampilkan setelah tersedia dari Pemerintah Gampong Blang.',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppTheme.g700,
                              fontWeight: FontWeight.w600,
                              height: 1.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
