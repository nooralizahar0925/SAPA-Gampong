import 'package:freezed_annotation/freezed_annotation.dart';

part 'upload_result.freezed.dart';
part 'upload_result.g.dart';

@freezed
abstract class UploadResult with _$UploadResult {
  const factory UploadResult({
    @JsonKey(name: 'file_id') required String fileId,
    required String url,
    required String mime,
    required int size,
  }) = _UploadResult;

  factory UploadResult.fromJson(Map<String, Object?> json) =>
      _$UploadResultFromJson(json);
}
