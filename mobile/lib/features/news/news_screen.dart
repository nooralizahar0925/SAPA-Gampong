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
          Center(
            child: Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                color: AppTheme.g50,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(
                Icons.article_outlined,
                size: 34,
                color: AppTheme.g500,
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Belum ada berita',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              'Kabar dan pengumuman dari Pemerintah Gampong Blang akan tampil di sini. Nantikan pembaruan berikutnya.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.ink500, height: 1.55),
            ),
          ),
          const SizedBox(height: 28),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.g50,
              border: Border.all(
                color: AppTheme.g200,
                style: BorderStyle.solid,
              ),
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
    );
  }
}
