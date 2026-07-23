// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'letter_request.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$LetterRequestDraft {

@JsonKey(name: 'letter_type') String get letterType;@JsonKey(name: 'applicant_name') String get applicantName;@JsonKey(name: 'applicant_email') String get applicantEmail;@JsonKey(name: 'applicant_phone') String get applicantPhone; String? get keperluan;@JsonKey(name: 'subject_data') Map<String, Object?> get subjectData; List<Attachment> get attachments;
/// Create a copy of LetterRequestDraft
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LetterRequestDraftCopyWith<LetterRequestDraft> get copyWith => _$LetterRequestDraftCopyWithImpl<LetterRequestDraft>(this as LetterRequestDraft, _$identity);

  /// Serializes this LetterRequestDraft to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LetterRequestDraft&&(identical(other.letterType, letterType) || other.letterType == letterType)&&(identical(other.applicantName, applicantName) || other.applicantName == applicantName)&&(identical(other.applicantEmail, applicantEmail) || other.applicantEmail == applicantEmail)&&(identical(other.applicantPhone, applicantPhone) || other.applicantPhone == applicantPhone)&&(identical(other.keperluan, keperluan) || other.keperluan == keperluan)&&const DeepCollectionEquality().equals(other.subjectData, subjectData)&&const DeepCollectionEquality().equals(other.attachments, attachments));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,letterType,applicantName,applicantEmail,applicantPhone,keperluan,const DeepCollectionEquality().hash(subjectData),const DeepCollectionEquality().hash(attachments));

@override
String toString() {
  return 'LetterRequestDraft(letterType: $letterType, applicantName: $applicantName, applicantEmail: $applicantEmail, applicantPhone: $applicantPhone, keperluan: $keperluan, subjectData: $subjectData, attachments: $attachments)';
}


}

/// @nodoc
abstract mixin class $LetterRequestDraftCopyWith<$Res>  {
  factory $LetterRequestDraftCopyWith(LetterRequestDraft value, $Res Function(LetterRequestDraft) _then) = _$LetterRequestDraftCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'letter_type') String letterType,@JsonKey(name: 'applicant_name') String applicantName,@JsonKey(name: 'applicant_email') String applicantEmail,@JsonKey(name: 'applicant_phone') String applicantPhone, String? keperluan,@JsonKey(name: 'subject_data') Map<String, Object?> subjectData, List<Attachment> attachments
});




}
/// @nodoc
class _$LetterRequestDraftCopyWithImpl<$Res>
    implements $LetterRequestDraftCopyWith<$Res> {
  _$LetterRequestDraftCopyWithImpl(this._self, this._then);

  final LetterRequestDraft _self;
  final $Res Function(LetterRequestDraft) _then;

/// Create a copy of LetterRequestDraft
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? letterType = null,Object? applicantName = null,Object? applicantEmail = null,Object? applicantPhone = null,Object? keperluan = freezed,Object? subjectData = null,Object? attachments = null,}) {
  return _then(_self.copyWith(
letterType: null == letterType ? _self.letterType : letterType // ignore: cast_nullable_to_non_nullable
as String,applicantName: null == applicantName ? _self.applicantName : applicantName // ignore: cast_nullable_to_non_nullable
as String,applicantEmail: null == applicantEmail ? _self.applicantEmail : applicantEmail // ignore: cast_nullable_to_non_nullable
as String,applicantPhone: null == applicantPhone ? _self.applicantPhone : applicantPhone // ignore: cast_nullable_to_non_nullable
as String,keperluan: freezed == keperluan ? _self.keperluan : keperluan // ignore: cast_nullable_to_non_nullable
as String?,subjectData: null == subjectData ? _self.subjectData : subjectData // ignore: cast_nullable_to_non_nullable
as Map<String, Object?>,attachments: null == attachments ? _self.attachments : attachments // ignore: cast_nullable_to_non_nullable
as List<Attachment>,
  ));
}

}


/// Adds pattern-matching-related methods to [LetterRequestDraft].
extension LetterRequestDraftPatterns on LetterRequestDraft {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LetterRequestDraft value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LetterRequestDraft() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LetterRequestDraft value)  $default,){
final _that = this;
switch (_that) {
case _LetterRequestDraft():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LetterRequestDraft value)?  $default,){
final _that = this;
switch (_that) {
case _LetterRequestDraft() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'letter_type')  String letterType, @JsonKey(name: 'applicant_name')  String applicantName, @JsonKey(name: 'applicant_email')  String applicantEmail, @JsonKey(name: 'applicant_phone')  String applicantPhone,  String? keperluan, @JsonKey(name: 'subject_data')  Map<String, Object?> subjectData,  List<Attachment> attachments)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LetterRequestDraft() when $default != null:
return $default(_that.letterType,_that.applicantName,_that.applicantEmail,_that.applicantPhone,_that.keperluan,_that.subjectData,_that.attachments);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'letter_type')  String letterType, @JsonKey(name: 'applicant_name')  String applicantName, @JsonKey(name: 'applicant_email')  String applicantEmail, @JsonKey(name: 'applicant_phone')  String applicantPhone,  String? keperluan, @JsonKey(name: 'subject_data')  Map<String, Object?> subjectData,  List<Attachment> attachments)  $default,) {final _that = this;
switch (_that) {
case _LetterRequestDraft():
return $default(_that.letterType,_that.applicantName,_that.applicantEmail,_that.applicantPhone,_that.keperluan,_that.subjectData,_that.attachments);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'letter_type')  String letterType, @JsonKey(name: 'applicant_name')  String applicantName, @JsonKey(name: 'applicant_email')  String applicantEmail, @JsonKey(name: 'applicant_phone')  String applicantPhone,  String? keperluan, @JsonKey(name: 'subject_data')  Map<String, Object?> subjectData,  List<Attachment> attachments)?  $default,) {final _that = this;
switch (_that) {
case _LetterRequestDraft() when $default != null:
return $default(_that.letterType,_that.applicantName,_that.applicantEmail,_that.applicantPhone,_that.keperluan,_that.subjectData,_that.attachments);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LetterRequestDraft implements LetterRequestDraft {
  const _LetterRequestDraft({@JsonKey(name: 'letter_type') required this.letterType, @JsonKey(name: 'applicant_name') required this.applicantName, @JsonKey(name: 'applicant_email') required this.applicantEmail, @JsonKey(name: 'applicant_phone') required this.applicantPhone, this.keperluan, @JsonKey(name: 'subject_data') final  Map<String, Object?> subjectData = const {}, final  List<Attachment> attachments = const []}): _subjectData = subjectData,_attachments = attachments;
  factory _LetterRequestDraft.fromJson(Map<String, dynamic> json) => _$LetterRequestDraftFromJson(json);

@override@JsonKey(name: 'letter_type') final  String letterType;
@override@JsonKey(name: 'applicant_name') final  String applicantName;
@override@JsonKey(name: 'applicant_email') final  String applicantEmail;
@override@JsonKey(name: 'applicant_phone') final  String applicantPhone;
@override final  String? keperluan;
 final  Map<String, Object?> _subjectData;
@override@JsonKey(name: 'subject_data') Map<String, Object?> get subjectData {
  if (_subjectData is EqualUnmodifiableMapView) return _subjectData;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_subjectData);
}

 final  List<Attachment> _attachments;
@override@JsonKey() List<Attachment> get attachments {
  if (_attachments is EqualUnmodifiableListView) return _attachments;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_attachments);
}


/// Create a copy of LetterRequestDraft
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LetterRequestDraftCopyWith<_LetterRequestDraft> get copyWith => __$LetterRequestDraftCopyWithImpl<_LetterRequestDraft>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LetterRequestDraftToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LetterRequestDraft&&(identical(other.letterType, letterType) || other.letterType == letterType)&&(identical(other.applicantName, applicantName) || other.applicantName == applicantName)&&(identical(other.applicantEmail, applicantEmail) || other.applicantEmail == applicantEmail)&&(identical(other.applicantPhone, applicantPhone) || other.applicantPhone == applicantPhone)&&(identical(other.keperluan, keperluan) || other.keperluan == keperluan)&&const DeepCollectionEquality().equals(other._subjectData, _subjectData)&&const DeepCollectionEquality().equals(other._attachments, _attachments));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,letterType,applicantName,applicantEmail,applicantPhone,keperluan,const DeepCollectionEquality().hash(_subjectData),const DeepCollectionEquality().hash(_attachments));

@override
String toString() {
  return 'LetterRequestDraft(letterType: $letterType, applicantName: $applicantName, applicantEmail: $applicantEmail, applicantPhone: $applicantPhone, keperluan: $keperluan, subjectData: $subjectData, attachments: $attachments)';
}


}

/// @nodoc
abstract mixin class _$LetterRequestDraftCopyWith<$Res> implements $LetterRequestDraftCopyWith<$Res> {
  factory _$LetterRequestDraftCopyWith(_LetterRequestDraft value, $Res Function(_LetterRequestDraft) _then) = __$LetterRequestDraftCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'letter_type') String letterType,@JsonKey(name: 'applicant_name') String applicantName,@JsonKey(name: 'applicant_email') String applicantEmail,@JsonKey(name: 'applicant_phone') String applicantPhone, String? keperluan,@JsonKey(name: 'subject_data') Map<String, Object?> subjectData, List<Attachment> attachments
});




}
/// @nodoc
class __$LetterRequestDraftCopyWithImpl<$Res>
    implements _$LetterRequestDraftCopyWith<$Res> {
  __$LetterRequestDraftCopyWithImpl(this._self, this._then);

  final _LetterRequestDraft _self;
  final $Res Function(_LetterRequestDraft) _then;

/// Create a copy of LetterRequestDraft
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? letterType = null,Object? applicantName = null,Object? applicantEmail = null,Object? applicantPhone = null,Object? keperluan = freezed,Object? subjectData = null,Object? attachments = null,}) {
  return _then(_LetterRequestDraft(
letterType: null == letterType ? _self.letterType : letterType // ignore: cast_nullable_to_non_nullable
as String,applicantName: null == applicantName ? _self.applicantName : applicantName // ignore: cast_nullable_to_non_nullable
as String,applicantEmail: null == applicantEmail ? _self.applicantEmail : applicantEmail // ignore: cast_nullable_to_non_nullable
as String,applicantPhone: null == applicantPhone ? _self.applicantPhone : applicantPhone // ignore: cast_nullable_to_non_nullable
as String,keperluan: freezed == keperluan ? _self.keperluan : keperluan // ignore: cast_nullable_to_non_nullable
as String?,subjectData: null == subjectData ? _self._subjectData : subjectData // ignore: cast_nullable_to_non_nullable
as Map<String, Object?>,attachments: null == attachments ? _self._attachments : attachments // ignore: cast_nullable_to_non_nullable
as List<Attachment>,
  ));
}


}


/// @nodoc
mixin _$CreatedRequest {

 String get id;@JsonKey(name: 'reference_code') String get referenceCode; String get status;
/// Create a copy of CreatedRequest
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CreatedRequestCopyWith<CreatedRequest> get copyWith => _$CreatedRequestCopyWithImpl<CreatedRequest>(this as CreatedRequest, _$identity);

  /// Serializes this CreatedRequest to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CreatedRequest&&(identical(other.id, id) || other.id == id)&&(identical(other.referenceCode, referenceCode) || other.referenceCode == referenceCode)&&(identical(other.status, status) || other.status == status));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,referenceCode,status);

@override
String toString() {
  return 'CreatedRequest(id: $id, referenceCode: $referenceCode, status: $status)';
}


}

/// @nodoc
abstract mixin class $CreatedRequestCopyWith<$Res>  {
  factory $CreatedRequestCopyWith(CreatedRequest value, $Res Function(CreatedRequest) _then) = _$CreatedRequestCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(name: 'reference_code') String referenceCode, String status
});




}
/// @nodoc
class _$CreatedRequestCopyWithImpl<$Res>
    implements $CreatedRequestCopyWith<$Res> {
  _$CreatedRequestCopyWithImpl(this._self, this._then);

  final CreatedRequest _self;
  final $Res Function(CreatedRequest) _then;

/// Create a copy of CreatedRequest
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? referenceCode = null,Object? status = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,referenceCode: null == referenceCode ? _self.referenceCode : referenceCode // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [CreatedRequest].
extension CreatedRequestPatterns on CreatedRequest {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CreatedRequest value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CreatedRequest() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CreatedRequest value)  $default,){
final _that = this;
switch (_that) {
case _CreatedRequest():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CreatedRequest value)?  $default,){
final _that = this;
switch (_that) {
case _CreatedRequest() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'reference_code')  String referenceCode,  String status)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CreatedRequest() when $default != null:
return $default(_that.id,_that.referenceCode,_that.status);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'reference_code')  String referenceCode,  String status)  $default,) {final _that = this;
switch (_that) {
case _CreatedRequest():
return $default(_that.id,_that.referenceCode,_that.status);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(name: 'reference_code')  String referenceCode,  String status)?  $default,) {final _that = this;
switch (_that) {
case _CreatedRequest() when $default != null:
return $default(_that.id,_that.referenceCode,_that.status);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CreatedRequest implements CreatedRequest {
  const _CreatedRequest({required this.id, @JsonKey(name: 'reference_code') required this.referenceCode, required this.status});
  factory _CreatedRequest.fromJson(Map<String, dynamic> json) => _$CreatedRequestFromJson(json);

@override final  String id;
@override@JsonKey(name: 'reference_code') final  String referenceCode;
@override final  String status;

/// Create a copy of CreatedRequest
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CreatedRequestCopyWith<_CreatedRequest> get copyWith => __$CreatedRequestCopyWithImpl<_CreatedRequest>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CreatedRequestToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CreatedRequest&&(identical(other.id, id) || other.id == id)&&(identical(other.referenceCode, referenceCode) || other.referenceCode == referenceCode)&&(identical(other.status, status) || other.status == status));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,referenceCode,status);

@override
String toString() {
  return 'CreatedRequest(id: $id, referenceCode: $referenceCode, status: $status)';
}


}

/// @nodoc
abstract mixin class _$CreatedRequestCopyWith<$Res> implements $CreatedRequestCopyWith<$Res> {
  factory _$CreatedRequestCopyWith(_CreatedRequest value, $Res Function(_CreatedRequest) _then) = __$CreatedRequestCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(name: 'reference_code') String referenceCode, String status
});




}
/// @nodoc
class __$CreatedRequestCopyWithImpl<$Res>
    implements _$CreatedRequestCopyWith<$Res> {
  __$CreatedRequestCopyWithImpl(this._self, this._then);

  final _CreatedRequest _self;
  final $Res Function(_CreatedRequest) _then;

/// Create a copy of CreatedRequest
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? referenceCode = null,Object? status = null,}) {
  return _then(_CreatedRequest(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,referenceCode: null == referenceCode ? _self.referenceCode : referenceCode // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$TrackStatusHistory {

 String get status; DateTime get at; String? get action; String? get by; String? get reason;@JsonKey(name: 'nomor_surat') String? get nomorSurat;
/// Create a copy of TrackStatusHistory
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TrackStatusHistoryCopyWith<TrackStatusHistory> get copyWith => _$TrackStatusHistoryCopyWithImpl<TrackStatusHistory>(this as TrackStatusHistory, _$identity);

  /// Serializes this TrackStatusHistory to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TrackStatusHistory&&(identical(other.status, status) || other.status == status)&&(identical(other.at, at) || other.at == at)&&(identical(other.action, action) || other.action == action)&&(identical(other.by, by) || other.by == by)&&(identical(other.reason, reason) || other.reason == reason)&&(identical(other.nomorSurat, nomorSurat) || other.nomorSurat == nomorSurat));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,status,at,action,by,reason,nomorSurat);

@override
String toString() {
  return 'TrackStatusHistory(status: $status, at: $at, action: $action, by: $by, reason: $reason, nomorSurat: $nomorSurat)';
}


}

/// @nodoc
abstract mixin class $TrackStatusHistoryCopyWith<$Res>  {
  factory $TrackStatusHistoryCopyWith(TrackStatusHistory value, $Res Function(TrackStatusHistory) _then) = _$TrackStatusHistoryCopyWithImpl;
@useResult
$Res call({
 String status, DateTime at, String? action, String? by, String? reason,@JsonKey(name: 'nomor_surat') String? nomorSurat
});




}
/// @nodoc
class _$TrackStatusHistoryCopyWithImpl<$Res>
    implements $TrackStatusHistoryCopyWith<$Res> {
  _$TrackStatusHistoryCopyWithImpl(this._self, this._then);

  final TrackStatusHistory _self;
  final $Res Function(TrackStatusHistory) _then;

/// Create a copy of TrackStatusHistory
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? status = null,Object? at = null,Object? action = freezed,Object? by = freezed,Object? reason = freezed,Object? nomorSurat = freezed,}) {
  return _then(_self.copyWith(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,at: null == at ? _self.at : at // ignore: cast_nullable_to_non_nullable
as DateTime,action: freezed == action ? _self.action : action // ignore: cast_nullable_to_non_nullable
as String?,by: freezed == by ? _self.by : by // ignore: cast_nullable_to_non_nullable
as String?,reason: freezed == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as String?,nomorSurat: freezed == nomorSurat ? _self.nomorSurat : nomorSurat // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [TrackStatusHistory].
extension TrackStatusHistoryPatterns on TrackStatusHistory {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TrackStatusHistory value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TrackStatusHistory() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TrackStatusHistory value)  $default,){
final _that = this;
switch (_that) {
case _TrackStatusHistory():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TrackStatusHistory value)?  $default,){
final _that = this;
switch (_that) {
case _TrackStatusHistory() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String status,  DateTime at,  String? action,  String? by,  String? reason, @JsonKey(name: 'nomor_surat')  String? nomorSurat)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TrackStatusHistory() when $default != null:
return $default(_that.status,_that.at,_that.action,_that.by,_that.reason,_that.nomorSurat);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String status,  DateTime at,  String? action,  String? by,  String? reason, @JsonKey(name: 'nomor_surat')  String? nomorSurat)  $default,) {final _that = this;
switch (_that) {
case _TrackStatusHistory():
return $default(_that.status,_that.at,_that.action,_that.by,_that.reason,_that.nomorSurat);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String status,  DateTime at,  String? action,  String? by,  String? reason, @JsonKey(name: 'nomor_surat')  String? nomorSurat)?  $default,) {final _that = this;
switch (_that) {
case _TrackStatusHistory() when $default != null:
return $default(_that.status,_that.at,_that.action,_that.by,_that.reason,_that.nomorSurat);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TrackStatusHistory implements TrackStatusHistory {
  const _TrackStatusHistory({required this.status, required this.at, this.action, this.by, this.reason, @JsonKey(name: 'nomor_surat') this.nomorSurat});
  factory _TrackStatusHistory.fromJson(Map<String, dynamic> json) => _$TrackStatusHistoryFromJson(json);

@override final  String status;
@override final  DateTime at;
@override final  String? action;
@override final  String? by;
@override final  String? reason;
@override@JsonKey(name: 'nomor_surat') final  String? nomorSurat;

/// Create a copy of TrackStatusHistory
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TrackStatusHistoryCopyWith<_TrackStatusHistory> get copyWith => __$TrackStatusHistoryCopyWithImpl<_TrackStatusHistory>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TrackStatusHistoryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _TrackStatusHistory&&(identical(other.status, status) || other.status == status)&&(identical(other.at, at) || other.at == at)&&(identical(other.action, action) || other.action == action)&&(identical(other.by, by) || other.by == by)&&(identical(other.reason, reason) || other.reason == reason)&&(identical(other.nomorSurat, nomorSurat) || other.nomorSurat == nomorSurat));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,status,at,action,by,reason,nomorSurat);

@override
String toString() {
  return 'TrackStatusHistory(status: $status, at: $at, action: $action, by: $by, reason: $reason, nomorSurat: $nomorSurat)';
}


}

/// @nodoc
abstract mixin class _$TrackStatusHistoryCopyWith<$Res> implements $TrackStatusHistoryCopyWith<$Res> {
  factory _$TrackStatusHistoryCopyWith(_TrackStatusHistory value, $Res Function(_TrackStatusHistory) _then) = __$TrackStatusHistoryCopyWithImpl;
@override @useResult
$Res call({
 String status, DateTime at, String? action, String? by, String? reason,@JsonKey(name: 'nomor_surat') String? nomorSurat
});




}
/// @nodoc
class __$TrackStatusHistoryCopyWithImpl<$Res>
    implements _$TrackStatusHistoryCopyWith<$Res> {
  __$TrackStatusHistoryCopyWithImpl(this._self, this._then);

  final _TrackStatusHistory _self;
  final $Res Function(_TrackStatusHistory) _then;

/// Create a copy of TrackStatusHistory
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? status = null,Object? at = null,Object? action = freezed,Object? by = freezed,Object? reason = freezed,Object? nomorSurat = freezed,}) {
  return _then(_TrackStatusHistory(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,at: null == at ? _self.at : at // ignore: cast_nullable_to_non_nullable
as DateTime,action: freezed == action ? _self.action : action // ignore: cast_nullable_to_non_nullable
as String?,by: freezed == by ? _self.by : by // ignore: cast_nullable_to_non_nullable
as String?,reason: freezed == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as String?,nomorSurat: freezed == nomorSurat ? _self.nomorSurat : nomorSurat // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$TrackStatus {

@JsonKey(name: 'reference_code') String get referenceCode;@JsonKey(name: 'letter_type') String get letterType; String get status;@JsonKey(name: 'status_label') String get statusLabel;@JsonKey(name: 'created_at') DateTime? get createdAt;@JsonKey(name: 'updated_at') DateTime get updatedAt;@JsonKey(name: 'status_history') List<TrackStatusHistory> get statusHistory;
/// Create a copy of TrackStatus
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TrackStatusCopyWith<TrackStatus> get copyWith => _$TrackStatusCopyWithImpl<TrackStatus>(this as TrackStatus, _$identity);

  /// Serializes this TrackStatus to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TrackStatus&&(identical(other.referenceCode, referenceCode) || other.referenceCode == referenceCode)&&(identical(other.letterType, letterType) || other.letterType == letterType)&&(identical(other.status, status) || other.status == status)&&(identical(other.statusLabel, statusLabel) || other.statusLabel == statusLabel)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&const DeepCollectionEquality().equals(other.statusHistory, statusHistory));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,referenceCode,letterType,status,statusLabel,createdAt,updatedAt,const DeepCollectionEquality().hash(statusHistory));

@override
String toString() {
  return 'TrackStatus(referenceCode: $referenceCode, letterType: $letterType, status: $status, statusLabel: $statusLabel, createdAt: $createdAt, updatedAt: $updatedAt, statusHistory: $statusHistory)';
}


}

/// @nodoc
abstract mixin class $TrackStatusCopyWith<$Res>  {
  factory $TrackStatusCopyWith(TrackStatus value, $Res Function(TrackStatus) _then) = _$TrackStatusCopyWithImpl;
@useResult
$Res call({
@JsonKey(name: 'reference_code') String referenceCode,@JsonKey(name: 'letter_type') String letterType, String status,@JsonKey(name: 'status_label') String statusLabel,@JsonKey(name: 'created_at') DateTime? createdAt,@JsonKey(name: 'updated_at') DateTime updatedAt,@JsonKey(name: 'status_history') List<TrackStatusHistory> statusHistory
});




}
/// @nodoc
class _$TrackStatusCopyWithImpl<$Res>
    implements $TrackStatusCopyWith<$Res> {
  _$TrackStatusCopyWithImpl(this._self, this._then);

  final TrackStatus _self;
  final $Res Function(TrackStatus) _then;

/// Create a copy of TrackStatus
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? referenceCode = null,Object? letterType = null,Object? status = null,Object? statusLabel = null,Object? createdAt = freezed,Object? updatedAt = null,Object? statusHistory = null,}) {
  return _then(_self.copyWith(
referenceCode: null == referenceCode ? _self.referenceCode : referenceCode // ignore: cast_nullable_to_non_nullable
as String,letterType: null == letterType ? _self.letterType : letterType // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,statusLabel: null == statusLabel ? _self.statusLabel : statusLabel // ignore: cast_nullable_to_non_nullable
as String,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,statusHistory: null == statusHistory ? _self.statusHistory : statusHistory // ignore: cast_nullable_to_non_nullable
as List<TrackStatusHistory>,
  ));
}

}


/// Adds pattern-matching-related methods to [TrackStatus].
extension TrackStatusPatterns on TrackStatus {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TrackStatus value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TrackStatus() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TrackStatus value)  $default,){
final _that = this;
switch (_that) {
case _TrackStatus():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TrackStatus value)?  $default,){
final _that = this;
switch (_that) {
case _TrackStatus() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(name: 'reference_code')  String referenceCode, @JsonKey(name: 'letter_type')  String letterType,  String status, @JsonKey(name: 'status_label')  String statusLabel, @JsonKey(name: 'created_at')  DateTime? createdAt, @JsonKey(name: 'updated_at')  DateTime updatedAt, @JsonKey(name: 'status_history')  List<TrackStatusHistory> statusHistory)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TrackStatus() when $default != null:
return $default(_that.referenceCode,_that.letterType,_that.status,_that.statusLabel,_that.createdAt,_that.updatedAt,_that.statusHistory);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(name: 'reference_code')  String referenceCode, @JsonKey(name: 'letter_type')  String letterType,  String status, @JsonKey(name: 'status_label')  String statusLabel, @JsonKey(name: 'created_at')  DateTime? createdAt, @JsonKey(name: 'updated_at')  DateTime updatedAt, @JsonKey(name: 'status_history')  List<TrackStatusHistory> statusHistory)  $default,) {final _that = this;
switch (_that) {
case _TrackStatus():
return $default(_that.referenceCode,_that.letterType,_that.status,_that.statusLabel,_that.createdAt,_that.updatedAt,_that.statusHistory);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(name: 'reference_code')  String referenceCode, @JsonKey(name: 'letter_type')  String letterType,  String status, @JsonKey(name: 'status_label')  String statusLabel, @JsonKey(name: 'created_at')  DateTime? createdAt, @JsonKey(name: 'updated_at')  DateTime updatedAt, @JsonKey(name: 'status_history')  List<TrackStatusHistory> statusHistory)?  $default,) {final _that = this;
switch (_that) {
case _TrackStatus() when $default != null:
return $default(_that.referenceCode,_that.letterType,_that.status,_that.statusLabel,_that.createdAt,_that.updatedAt,_that.statusHistory);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TrackStatus implements TrackStatus {
  const _TrackStatus({@JsonKey(name: 'reference_code') required this.referenceCode, @JsonKey(name: 'letter_type') required this.letterType, required this.status, @JsonKey(name: 'status_label') required this.statusLabel, @JsonKey(name: 'created_at') this.createdAt, @JsonKey(name: 'updated_at') required this.updatedAt, @JsonKey(name: 'status_history') final  List<TrackStatusHistory> statusHistory = const []}): _statusHistory = statusHistory;
  factory _TrackStatus.fromJson(Map<String, dynamic> json) => _$TrackStatusFromJson(json);

@override@JsonKey(name: 'reference_code') final  String referenceCode;
@override@JsonKey(name: 'letter_type') final  String letterType;
@override final  String status;
@override@JsonKey(name: 'status_label') final  String statusLabel;
@override@JsonKey(name: 'created_at') final  DateTime? createdAt;
@override@JsonKey(name: 'updated_at') final  DateTime updatedAt;
 final  List<TrackStatusHistory> _statusHistory;
@override@JsonKey(name: 'status_history') List<TrackStatusHistory> get statusHistory {
  if (_statusHistory is EqualUnmodifiableListView) return _statusHistory;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_statusHistory);
}


/// Create a copy of TrackStatus
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TrackStatusCopyWith<_TrackStatus> get copyWith => __$TrackStatusCopyWithImpl<_TrackStatus>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TrackStatusToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _TrackStatus&&(identical(other.referenceCode, referenceCode) || other.referenceCode == referenceCode)&&(identical(other.letterType, letterType) || other.letterType == letterType)&&(identical(other.status, status) || other.status == status)&&(identical(other.statusLabel, statusLabel) || other.statusLabel == statusLabel)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&const DeepCollectionEquality().equals(other._statusHistory, _statusHistory));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,referenceCode,letterType,status,statusLabel,createdAt,updatedAt,const DeepCollectionEquality().hash(_statusHistory));

@override
String toString() {
  return 'TrackStatus(referenceCode: $referenceCode, letterType: $letterType, status: $status, statusLabel: $statusLabel, createdAt: $createdAt, updatedAt: $updatedAt, statusHistory: $statusHistory)';
}


}

/// @nodoc
abstract mixin class _$TrackStatusCopyWith<$Res> implements $TrackStatusCopyWith<$Res> {
  factory _$TrackStatusCopyWith(_TrackStatus value, $Res Function(_TrackStatus) _then) = __$TrackStatusCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(name: 'reference_code') String referenceCode,@JsonKey(name: 'letter_type') String letterType, String status,@JsonKey(name: 'status_label') String statusLabel,@JsonKey(name: 'created_at') DateTime? createdAt,@JsonKey(name: 'updated_at') DateTime updatedAt,@JsonKey(name: 'status_history') List<TrackStatusHistory> statusHistory
});




}
/// @nodoc
class __$TrackStatusCopyWithImpl<$Res>
    implements _$TrackStatusCopyWith<$Res> {
  __$TrackStatusCopyWithImpl(this._self, this._then);

  final _TrackStatus _self;
  final $Res Function(_TrackStatus) _then;

/// Create a copy of TrackStatus
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? referenceCode = null,Object? letterType = null,Object? status = null,Object? statusLabel = null,Object? createdAt = freezed,Object? updatedAt = null,Object? statusHistory = null,}) {
  return _then(_TrackStatus(
referenceCode: null == referenceCode ? _self.referenceCode : referenceCode // ignore: cast_nullable_to_non_nullable
as String,letterType: null == letterType ? _self.letterType : letterType // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,statusLabel: null == statusLabel ? _self.statusLabel : statusLabel // ignore: cast_nullable_to_non_nullable
as String,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,statusHistory: null == statusHistory ? _self._statusHistory : statusHistory // ignore: cast_nullable_to_non_nullable
as List<TrackStatusHistory>,
  ));
}


}

// dart format on
