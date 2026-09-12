import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sapa_gampong/data/models/gallery_item.dart';
import 'package:sapa_gampong/data/providers/content_providers.dart';
import 'package:sapa_gampong/features/gallery/gallery_screen.dart';

void main() {
  testWidgets('gallery screen renders photo and video items', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          galleryProvider.overrideWith(
            (_) async => const [
              GalleryItem(
                id: 'photo-1',
                mediaType: GalleryMediaType.photo,
                fileId: 'file-photo-1',
                title: 'Gotong royong dusun',
                caption: 'Dokumentasi kegiatan warga.',
              ),
              GalleryItem(
                id: 'video-1',
                mediaType: GalleryMediaType.video,
                fileId: 'file-video-1',
                title: 'Cuplikan musyawarah',
              ),
            ],
          ),
        ],
        child: const MaterialApp(home: GalleryScreen()),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Galeri'), findsWidgets);
    expect(find.text('Gotong royong dusun'), findsOneWidget);
    expect(find.text('Cuplikan musyawarah'), findsOneWidget);
    expect(find.text('Foto'), findsOneWidget);
    expect(find.text('Video'), findsOneWidget);
  });

  testWidgets('gallery screen shows empty state', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [galleryProvider.overrideWith((_) async => const [])],
        child: const MaterialApp(home: GalleryScreen()),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Belum ada media'), findsOneWidget);
  });
}
