import 'package:freezed_annotation/freezed_annotation.dart';

import 'attachment.dart';

part 'letter_request.freezed.dart';
part 'letter_request.g.dart';

@freezed
abstract class LetterRequestDraft with _$LetterRequestDraft {
  const factory LetterRequestDraft({
    @JsonKey(name: 'letter_type') required String letterType,
    @JsonKey(name: 'applicant_name') required String applicantName,
    @JsonKey(name: 'applicant_email') required String applicantEmail,
    @JsonKey(name: 'applicant_phone') required String applicantPhone,
    String? keperluan,
    @JsonKey(name: 'subject_data')
    @Default({})
    Map<String, Object?> subjectData,
    @Default([]) List<Attachment> attachments,
  }) = _LetterRequestDraft;

  factory LetterRequestDraft.fromJson(Map<String, Object?> json) =>
      _$LetterRequestDraftFromJson(json);
}

@freezed
abstract class CreatedRequest with _$CreatedRequest {
  const factory CreatedRequest({
    required String id,
    @JsonKey(name: 'reference_code') required String referenceCode,
    required String status,
  }) = _CreatedRequest;

  factory CreatedRequest.fromJson(Map<String, Object?> json) =>
      _$CreatedRequestFromJson(json);
}

@freezed
abstract class TrackStatusHistory with _$TrackStatusHistory {
  const factory TrackStatusHistory({
    required String status,
    required DateTime at,
    String? action,
    String? by,
    String? reason,
    @JsonKey(name: 'nomor_surat') String? nomorSurat,
  }) = _TrackStatusHistory;

  factory TrackStatusHistory.fromJson(Map<String, Object?> json) =>
      _$TrackStatusHistoryFromJson(json);
}

@freezed
abstract class TrackStatus with _$TrackStatus {
  const factory TrackStatus({
    @JsonKey(name: 'reference_code') required String referenceCode,
    @JsonKey(name: 'letter_type') required String letterType,
    required String status,
    @JsonKey(name: 'status_label') required String statusLabel,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') required DateTime updatedAt,
    @JsonKey(name: 'status_history')
    @Default([])
    List<TrackStatusHistory> statusHistory,
  }) = _TrackStatus;

  factory TrackStatus.fromJson(Map<String, Object?> json) =>
      _$TrackStatusFromJson(json);
}
