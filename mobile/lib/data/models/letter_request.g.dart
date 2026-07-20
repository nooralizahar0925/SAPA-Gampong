// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'letter_request.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_LetterRequestDraft _$LetterRequestDraftFromJson(Map<String, dynamic> json) =>
    _LetterRequestDraft(
      letterType: json['letter_type'] as String,
      applicantName: json['applicant_name'] as String,
      applicantEmail: json['applicant_email'] as String,
      applicantPhone: json['applicant_phone'] as String,
      keperluan: json['keperluan'] as String?,
      subjectData: json['subject_data'] as Map<String, dynamic>? ?? const {},
      attachments:
          (json['attachments'] as List<dynamic>?)
              ?.map((e) => Attachment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$LetterRequestDraftToJson(_LetterRequestDraft instance) =>
    <String, dynamic>{
      'letter_type': instance.letterType,
      'applicant_name': instance.applicantName,
      'applicant_email': instance.applicantEmail,
      'applicant_phone': instance.applicantPhone,
      'keperluan': instance.keperluan,
      'subject_data': instance.subjectData,
      'attachments': instance.attachments,
    };

_CreatedRequest _$CreatedRequestFromJson(Map<String, dynamic> json) =>
    _CreatedRequest(
      id: json['id'] as String,
      referenceCode: json['reference_code'] as String,
      status: json['status'] as String,
    );

Map<String, dynamic> _$CreatedRequestToJson(_CreatedRequest instance) =>
    <String, dynamic>{
      'id': instance.id,
      'reference_code': instance.referenceCode,
      'status': instance.status,
    };

_TrackStatus _$TrackStatusFromJson(Map<String, dynamic> json) => _TrackStatus(
  referenceCode: json['reference_code'] as String,
  letterType: json['letter_type'] as String,
  status: json['status'] as String,
  statusLabel: json['status_label'] as String,
  updatedAt: DateTime.parse(json['updated_at'] as String),
);

Map<String, dynamic> _$TrackStatusToJson(_TrackStatus instance) =>
    <String, dynamic>{
      'reference_code': instance.referenceCode,
      'letter_type': instance.letterType,
      'status': instance.status,
      'status_label': instance.statusLabel,
      'updated_at': instance.updatedAt.toIso8601String(),
    };
