enum GalleryMediaType {
  photo,
  video;

  static GalleryMediaType fromJson(Object? value) {
    return value == 'video' ? GalleryMediaType.video : GalleryMediaType.photo;
  }
}

class GalleryItem {
  const GalleryItem({
    required this.id,
    required this.mediaType,
    required this.fileId,
    required this.title,
    this.mediaUrl,
    this.caption,
    this.order = 0,
    this.active = true,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final GalleryMediaType mediaType;
  final String fileId;
  final String? mediaUrl;
  final String title;
  final String? caption;
  final int order;
  final bool active;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isVideo => mediaType == GalleryMediaType.video;

  factory GalleryItem.fromJson(Map<String, Object?> json) {
    return GalleryItem(
      id: json['id'] as String? ?? '',
      mediaType: GalleryMediaType.fromJson(json['media_type']),
      fileId: json['file_id'] as String? ?? '',
      mediaUrl: json['media_url'] as String?,
      title: json['title'] as String? ?? '',
      caption: json['caption'] as String?,
      order: json['order'] as int? ?? 0,
      active: json['active'] as bool? ?? true,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? ''),
      updatedAt: DateTime.tryParse(json['updated_at'] as String? ?? ''),
    );
  }
}
