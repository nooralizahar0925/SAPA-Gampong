// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'field_spec.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$FieldSpec {

 String get key; String get label; FieldType get type; bool get required; List<String> get options;
/// Create a copy of FieldSpec
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FieldSpecCopyWith<FieldSpec> get copyWith => _$FieldSpecCopyWithImpl<FieldSpec>(this as FieldSpec, _$identity);

  /// Serializes this FieldSpec to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FieldSpec&&(identical(other.key, key) || other.key == key)&&(identical(other.label, label) || other.label == label)&&(identical(other.type, type) || other.type == type)&&(identical(other.required, required) || other.required == required)&&const DeepCollectionEquality().equals(other.options, options));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,key,label,type,required,const DeepCollectionEquality().hash(options));

@override
String toString() {
  return 'FieldSpec(key: $key, label: $label, type: $type, required: $required, options: $options)';
}


}

/// @nodoc
abstract mixin class $FieldSpecCopyWith<$Res>  {
  factory $FieldSpecCopyWith(FieldSpec value, $Res Function(FieldSpec) _then) = _$FieldSpecCopyWithImpl;
@useResult
$Res call({
 String key, String label, FieldType type, bool required, List<String> options
});




}
/// @nodoc
class _$FieldSpecCopyWithImpl<$Res>
    implements $FieldSpecCopyWith<$Res> {
  _$FieldSpecCopyWithImpl(this._self, this._then);

  final FieldSpec _self;
  final $Res Function(FieldSpec) _then;

/// Create a copy of FieldSpec
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? key = null,Object? label = null,Object? type = null,Object? required = null,Object? options = null,}) {
  return _then(_self.copyWith(
key: null == key ? _self.key : key // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as FieldType,required: null == required ? _self.required : required // ignore: cast_nullable_to_non_nullable
as bool,options: null == options ? _self.options : options // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}

}


/// Adds pattern-matching-related methods to [FieldSpec].
extension FieldSpecPatterns on FieldSpec {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FieldSpec value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FieldSpec() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FieldSpec value)  $default,){
final _that = this;
switch (_that) {
case _FieldSpec():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FieldSpec value)?  $default,){
final _that = this;
switch (_that) {
case _FieldSpec() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String key,  String label,  FieldType type,  bool required,  List<String> options)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FieldSpec() when $default != null:
return $default(_that.key,_that.label,_that.type,_that.required,_that.options);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String key,  String label,  FieldType type,  bool required,  List<String> options)  $default,) {final _that = this;
switch (_that) {
case _FieldSpec():
return $default(_that.key,_that.label,_that.type,_that.required,_that.options);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String key,  String label,  FieldType type,  bool required,  List<String> options)?  $default,) {final _that = this;
switch (_that) {
case _FieldSpec() when $default != null:
return $default(_that.key,_that.label,_that.type,_that.required,_that.options);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FieldSpec implements FieldSpec {
  const _FieldSpec({required this.key, required this.label, required this.type, required this.required, final  List<String> options = const []}): _options = options;
  factory _FieldSpec.fromJson(Map<String, dynamic> json) => _$FieldSpecFromJson(json);

@override final  String key;
@override final  String label;
@override final  FieldType type;
@override final  bool required;
 final  List<String> _options;
@override@JsonKey() List<String> get options {
  if (_options is EqualUnmodifiableListView) return _options;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_options);
}


/// Create a copy of FieldSpec
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FieldSpecCopyWith<_FieldSpec> get copyWith => __$FieldSpecCopyWithImpl<_FieldSpec>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FieldSpecToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _FieldSpec&&(identical(other.key, key) || other.key == key)&&(identical(other.label, label) || other.label == label)&&(identical(other.type, type) || other.type == type)&&(identical(other.required, required) || other.required == required)&&const DeepCollectionEquality().equals(other._options, _options));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,key,label,type,required,const DeepCollectionEquality().hash(_options));

@override
String toString() {
  return 'FieldSpec(key: $key, label: $label, type: $type, required: $required, options: $options)';
}


}

/// @nodoc
abstract mixin class _$FieldSpecCopyWith<$Res> implements $FieldSpecCopyWith<$Res> {
  factory _$FieldSpecCopyWith(_FieldSpec value, $Res Function(_FieldSpec) _then) = __$FieldSpecCopyWithImpl;
@override @useResult
$Res call({
 String key, String label, FieldType type, bool required, List<String> options
});




}
/// @nodoc
class __$FieldSpecCopyWithImpl<$Res>
    implements _$FieldSpecCopyWith<$Res> {
  __$FieldSpecCopyWithImpl(this._self, this._then);

  final _FieldSpec _self;
  final $Res Function(_FieldSpec) _then;

/// Create a copy of FieldSpec
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? key = null,Object? label = null,Object? type = null,Object? required = null,Object? options = null,}) {
  return _then(_FieldSpec(
key: null == key ? _self.key : key // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as FieldType,required: null == required ? _self.required : required // ignore: cast_nullable_to_non_nullable
as bool,options: null == options ? _self._options : options // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}


}

// dart format on
