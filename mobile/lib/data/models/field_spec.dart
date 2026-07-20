import 'package:freezed_annotation/freezed_annotation.dart';

part 'field_spec.freezed.dart';
part 'field_spec.g.dart';

@JsonEnum(valueField: 'wireName')
enum FieldType {
  text('text'),
  textarea('textarea'),
  date('date'),
  time('time'),
  year('year'),
  number('number'),
  nik('nik'),
  phone('phone'),
  email('email'),
  enumT('enum');

  const FieldType(this.wireName);

  final String wireName;
}

@freezed
abstract class FieldSpec with _$FieldSpec {
  const factory FieldSpec({
    required String key,
    required String label,
    required FieldType type,
    required bool required,
    @Default([]) List<String> options,
  }) = _FieldSpec;

  factory FieldSpec.fromJson(Map<String, Object?> json) =>
      _$FieldSpecFromJson(json);
}
