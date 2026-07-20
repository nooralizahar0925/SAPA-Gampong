// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'letter_type.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$LetterType {

 String get code; String get name; String get description;@JsonKey(name: 'subject_is_applicant') bool get subjectIsApplicant;@JsonKey(name: 'required_attachments') List<String> get requiredAttachments; List<FieldSpec> get fields;
/// Create a copy of LetterType
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LetterTypeCopyWith<LetterType> get copyWith => _$LetterTypeCopyWithImpl<LetterType>(this as LetterType, _$identity);

  /// Serializes this LetterType to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LetterType&&(identical(other.code, code) || other.code == code)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.subjectIsApplicant, subjectIsApplicant) || other.subjectIsApplicant == subjectIsApplicant)&&const DeepCollectionEquality().equals(other.requiredAttachments, requiredAttachments)&&const DeepCollectionEquality().equals(other.fields, fields));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,code,name,description,subjectIsApplicant,const DeepCollectionEquality().hash(requiredAttachments),const DeepCollectionEquality().hash(fields));

@override
String toString() {
  return 'LetterType(code: $code, name: $name, description: $description, subjectIsApplicant: $subjectIsApplicant, requiredAttachments: $requiredAttachments, fields: $fields)';
}


}

/// @nodoc
abstract mixin class $LetterTypeCopyWith<$Res>  {
  factory $LetterTypeCopyWith(LetterType value, $Res Function(LetterType) _then) = _$LetterTypeCopyWithImpl;
@useResult
$Res call({
 String code, String name, String description,@JsonKey(name: 'subject_is_applicant') bool subjectIsApplicant,@JsonKey(name: 'required_attachments') List<String> requiredAttachments, List<FieldSpec> fields
});




}
/// @nodoc
class _$LetterTypeCopyWithImpl<$Res>
    implements $LetterTypeCopyWith<$Res> {
  _$LetterTypeCopyWithImpl(this._self, this._then);

  final LetterType _self;
  final $Res Function(LetterType) _then;

/// Create a copy of LetterType
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? code = null,Object? name = null,Object? description = null,Object? subjectIsApplicant = null,Object? requiredAttachments = null,Object? fields = null,}) {
  return _then(_self.copyWith(
code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,subjectIsApplicant: null == subjectIsApplicant ? _self.subjectIsApplicant : subjectIsApplicant // ignore: cast_nullable_to_non_nullable
as bool,requiredAttachments: null == requiredAttachments ? _self.requiredAttachments : requiredAttachments // ignore: cast_nullable_to_non_nullable
as List<String>,fields: null == fields ? _self.fields : fields // ignore: cast_nullable_to_non_nullable
as List<FieldSpec>,
  ));
}

}


/// Adds pattern-matching-related methods to [LetterType].
extension LetterTypePatterns on LetterType {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LetterType value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LetterType() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LetterType value)  $default,){
final _that = this;
switch (_that) {
case _LetterType():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LetterType value)?  $default,){
final _that = this;
switch (_that) {
case _LetterType() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String code,  String name,  String description, @JsonKey(name: 'subject_is_applicant')  bool subjectIsApplicant, @JsonKey(name: 'required_attachments')  List<String> requiredAttachments,  List<FieldSpec> fields)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LetterType() when $default != null:
return $default(_that.code,_that.name,_that.description,_that.subjectIsApplicant,_that.requiredAttachments,_that.fields);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String code,  String name,  String description, @JsonKey(name: 'subject_is_applicant')  bool subjectIsApplicant, @JsonKey(name: 'required_attachments')  List<String> requiredAttachments,  List<FieldSpec> fields)  $default,) {final _that = this;
switch (_that) {
case _LetterType():
return $default(_that.code,_that.name,_that.description,_that.subjectIsApplicant,_that.requiredAttachments,_that.fields);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String code,  String name,  String description, @JsonKey(name: 'subject_is_applicant')  bool subjectIsApplicant, @JsonKey(name: 'required_attachments')  List<String> requiredAttachments,  List<FieldSpec> fields)?  $default,) {final _that = this;
switch (_that) {
case _LetterType() when $default != null:
return $default(_that.code,_that.name,_that.description,_that.subjectIsApplicant,_that.requiredAttachments,_that.fields);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LetterType implements LetterType {
  const _LetterType({required this.code, required this.name, required this.description, @JsonKey(name: 'subject_is_applicant') required this.subjectIsApplicant, @JsonKey(name: 'required_attachments') final  List<String> requiredAttachments = const [], final  List<FieldSpec> fields = const []}): _requiredAttachments = requiredAttachments,_fields = fields;
  factory _LetterType.fromJson(Map<String, dynamic> json) => _$LetterTypeFromJson(json);

@override final  String code;
@override final  String name;
@override final  String description;
@override@JsonKey(name: 'subject_is_applicant') final  bool subjectIsApplicant;
 final  List<String> _requiredAttachments;
@override@JsonKey(name: 'required_attachments') List<String> get requiredAttachments {
  if (_requiredAttachments is EqualUnmodifiableListView) return _requiredAttachments;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_requiredAttachments);
}

 final  List<FieldSpec> _fields;
@override@JsonKey() List<FieldSpec> get fields {
  if (_fields is EqualUnmodifiableListView) return _fields;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_fields);
}


/// Create a copy of LetterType
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LetterTypeCopyWith<_LetterType> get copyWith => __$LetterTypeCopyWithImpl<_LetterType>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LetterTypeToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LetterType&&(identical(other.code, code) || other.code == code)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.subjectIsApplicant, subjectIsApplicant) || other.subjectIsApplicant == subjectIsApplicant)&&const DeepCollectionEquality().equals(other._requiredAttachments, _requiredAttachments)&&const DeepCollectionEquality().equals(other._fields, _fields));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,code,name,description,subjectIsApplicant,const DeepCollectionEquality().hash(_requiredAttachments),const DeepCollectionEquality().hash(_fields));

@override
String toString() {
  return 'LetterType(code: $code, name: $name, description: $description, subjectIsApplicant: $subjectIsApplicant, requiredAttachments: $requiredAttachments, fields: $fields)';
}


}

/// @nodoc
abstract mixin class _$LetterTypeCopyWith<$Res> implements $LetterTypeCopyWith<$Res> {
  factory _$LetterTypeCopyWith(_LetterType value, $Res Function(_LetterType) _then) = __$LetterTypeCopyWithImpl;
@override @useResult
$Res call({
 String code, String name, String description,@JsonKey(name: 'subject_is_applicant') bool subjectIsApplicant,@JsonKey(name: 'required_attachments') List<String> requiredAttachments, List<FieldSpec> fields
});




}
/// @nodoc
class __$LetterTypeCopyWithImpl<$Res>
    implements _$LetterTypeCopyWith<$Res> {
  __$LetterTypeCopyWithImpl(this._self, this._then);

  final _LetterType _self;
  final $Res Function(_LetterType) _then;

/// Create a copy of LetterType
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? code = null,Object? name = null,Object? description = null,Object? subjectIsApplicant = null,Object? requiredAttachments = null,Object? fields = null,}) {
  return _then(_LetterType(
code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,subjectIsApplicant: null == subjectIsApplicant ? _self.subjectIsApplicant : subjectIsApplicant // ignore: cast_nullable_to_non_nullable
as bool,requiredAttachments: null == requiredAttachments ? _self._requiredAttachments : requiredAttachments // ignore: cast_nullable_to_non_nullable
as List<String>,fields: null == fields ? _self._fields : fields // ignore: cast_nullable_to_non_nullable
as List<FieldSpec>,
  ));
}


}

// dart format on
