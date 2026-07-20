// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'letter_type.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_LetterType _$LetterTypeFromJson(Map<String, dynamic> json) => _LetterType(
  code: json['code'] as String,
  name: json['name'] as String,
  description: json['description'] as String,
  subjectIsApplicant: json['subject_is_applicant'] as bool,
  requiredAttachments:
      (json['required_attachments'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const [],
  fields:
      (json['fields'] as List<dynamic>?)
          ?.map((e) => FieldSpec.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
);

Map<String, dynamic> _$LetterTypeToJson(_LetterType instance) =>
    <String, dynamic>{
      'code': instance.code,
      'name': instance.name,
      'description': instance.description,
      'subject_is_applicant': instance.subjectIsApplicant,
      'required_attachments': instance.requiredAttachments,
      'fields': instance.fields,
    };
