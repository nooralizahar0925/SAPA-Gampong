import 'package:freezed_annotation/freezed_annotation.dart';

part 'village_profile.freezed.dart';
part 'village_profile.g.dart';

@freezed
abstract class VillageProfile with _$VillageProfile {
  const factory VillageProfile({
    String? name,
    @JsonKey(name: 'founded_date') String? foundedDate,
    String? kecamatan,
    String? kabupaten,
    String? kemukiman,
    @JsonKey(name: 'area_size') String? areaSize,
    String? elevation,
    @JsonKey(name: 'contact_phone') String? contactPhone,
    String? email,
    @JsonKey(name: 'map_lat') double? mapLat,
    @JsonKey(name: 'map_lng') double? mapLng,
    String? description,
    @JsonKey(name: 'photo_file_id') String? photoFileId,
    @JsonKey(name: 'photo_url') String? photoUrl,
    @JsonKey(name: 'updated_at') String? updatedAt,
  }) = _VillageProfile;

  factory VillageProfile.fromJson(Map<String, Object?> json) =>
      _$VillageProfileFromJson(json);
}
