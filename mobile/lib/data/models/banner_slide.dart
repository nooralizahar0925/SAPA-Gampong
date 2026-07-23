import 'package:freezed_annotation/freezed_annotation.dart';

part 'banner_slide.freezed.dart';
part 'banner_slide.g.dart';

@freezed
abstract class BannerSlide with _$BannerSlide {
  const factory BannerSlide({
    required String id,
    @JsonKey(name: 'image_file_id') required String imageFileId,
    @JsonKey(name: 'image_url') String? imageUrl,
    @JsonKey(name: 'link_url') String? linkUrl,
    @Default(0) int order,
    @Default(true) bool active,
  }) = _BannerSlide;

  factory BannerSlide.fromJson(Map<String, Object?> json) =>
      _$BannerSlideFromJson(json);
}
