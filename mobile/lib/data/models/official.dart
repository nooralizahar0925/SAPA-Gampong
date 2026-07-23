import 'package:freezed_annotation/freezed_annotation.dart';

part 'official.freezed.dart';
part 'official.g.dart';

@freezed
abstract class Official with _$Official {
  const factory Official({
    required String id,
    required String name,
    required String role,
    @JsonKey(name: 'photo_file_id') String? photoFileId,
    @JsonKey(name: 'photo_url') String? photoUrl,
    @Default(0) int order,
    @JsonKey(name: 'is_leadership_highlight') @Default(false) bool isLeadershipHighlight,
  }) = _Official;

  factory Official.fromJson(Map<String, Object?> json) =>
      _$OfficialFromJson(json);
}
