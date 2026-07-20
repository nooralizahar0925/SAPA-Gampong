import 'package:flutter/material.dart';

import '../../core/widgets/sapa_scaffold.dart';

class NewsScreen extends StatelessWidget {
  const NewsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Berita',
      subtitle: 'Fitur fase berikutnya',
      selectedIndex: 2,
      body: Center(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(
                  Icons.article_outlined,
                  size: 48,
                  color: Color(0xFF667069),
                ),
                SizedBox(height: 12),
                Text(
                  'Belum ada berita',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                SizedBox(height: 8),
                Text(
                  'Berita, pengumuman, galeri, dan arsip surat disiapkan untuk fase berikutnya.',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
