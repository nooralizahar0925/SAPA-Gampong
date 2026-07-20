import 'package:freezed_annotation/freezed_annotation.dart';

import 'field_spec.dart';

part 'letter_type.freezed.dart';
part 'letter_type.g.dart';

@freezed
abstract class LetterType with _$LetterType {
  const factory LetterType({
    required String code,
    required String name,
    required String description,
    @JsonKey(name: 'subject_is_applicant') required bool subjectIsApplicant,
    @JsonKey(name: 'required_attachments')
    @Default([])
    List<String> requiredAttachments,
    @Default([]) List<FieldSpec> fields,
  }) = _LetterType;

  factory LetterType.fromJson(Map<String, Object?> json) =>
      _$LetterTypeFromJson(json);
}
