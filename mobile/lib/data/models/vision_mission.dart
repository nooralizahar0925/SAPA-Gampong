import 'package:freezed_annotation/freezed_annotation.dart';

part 'vision_mission.freezed.dart';
part 'vision_mission.g.dart';

@freezed
abstract class VisionMission with _$VisionMission {
  const factory VisionMission({
    String? vision,
    @Default([]) List<String> missions,
    @JsonKey(name: 'updated_at') String? updatedAt,
  }) = _VisionMission;

  factory VisionMission.fromJson(Map<String, Object?> json) =>
      _$VisionMissionFromJson(json);
}
