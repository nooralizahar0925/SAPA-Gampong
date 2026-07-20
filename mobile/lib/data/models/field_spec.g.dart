// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'field_spec.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_FieldSpec _$FieldSpecFromJson(Map<String, dynamic> json) => _FieldSpec(
  key: json['key'] as String,
  label: json['label'] as String,
  type: $enumDecode(_$FieldTypeEnumMap, json['type']),
  required: json['required'] as bool,
  options:
      (json['options'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const [],
);

Map<String, dynamic> _$FieldSpecToJson(_FieldSpec instance) =>
    <String, dynamic>{
      'key': instance.key,
      'label': instance.label,
      'type': _$FieldTypeEnumMap[instance.type]!,
      'required': instance.required,
      'options': instance.options,
    };

const _$FieldTypeEnumMap = {
  FieldType.text: 'text',
  FieldType.textarea: 'textarea',
  FieldType.date: 'date',
  FieldType.time: 'time',
  FieldType.year: 'year',
  FieldType.number: 'number',
  FieldType.nik: 'nik',
  FieldType.phone: 'phone',
  FieldType.email: 'email',
  FieldType.enumT: 'enum',
};
