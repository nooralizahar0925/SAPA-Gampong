import 'package:freezed_annotation/freezed_annotation.dart';

part 'village_strength.freezed.dart';
part 'village_strength.g.dart';

@freezed
abstract class VillageStrength with _$VillageStrength {
  const factory VillageStrength({
    required String id,
    required String title,
    required String body,
    @JsonKey(name: 'photo_file_id') String? photoFileId,
    @JsonKey(name: 'photo_url') String? photoUrl,
    @Default(0) int order,
  }) = _VillageStrength;

  factory VillageStrength.fromJson(Map<String, Object?> json) =>
      _$VillageStrengthFromJson(json);
}
