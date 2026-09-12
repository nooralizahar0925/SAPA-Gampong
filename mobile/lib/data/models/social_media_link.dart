enum SocialMediaPlatform {
  facebook,
  instagram,
  youtube,
  tiktok,
  whatsapp,
  x,
  website,
  other;

  static SocialMediaPlatform fromJson(Object? value) {
    return switch (value) {
      'facebook' => SocialMediaPlatform.facebook,
      'instagram' => SocialMediaPlatform.instagram,
      'youtube' => SocialMediaPlatform.youtube,
      'tiktok' => SocialMediaPlatform.tiktok,
      'whatsapp' => SocialMediaPlatform.whatsapp,
      'x' => SocialMediaPlatform.x,
      'website' => SocialMediaPlatform.website,
      _ => SocialMediaPlatform.other,
    };
  }
}

class SocialMediaLink {
  const SocialMediaLink({
    required this.id,
    required this.platform,
    required this.label,
    required this.url,
    this.iconUrl,
    this.order = 0,
    this.active = true,
  });

  final String id;
  final SocialMediaPlatform platform;
  final String label;
  final String url;
  final String? iconUrl;
  final int order;
  final bool active;

  factory SocialMediaLink.fromJson(Map<String, Object?> json) {
    return SocialMediaLink(
      id: json['id'] as String? ?? '',
      platform: SocialMediaPlatform.fromJson(json['platform']),
      label: json['label'] as String? ?? '',
      url: json['url'] as String? ?? '',
      iconUrl: json['icon_url'] as String?,
      order: json['order'] as int? ?? 0,
      active: json['active'] as bool? ?? true,
    );
  }
}
