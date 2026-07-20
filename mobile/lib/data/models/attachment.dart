import 'package:freezed_annotation/freezed_annotation.dart';

part 'attachment.freezed.dart';
part 'attachment.g.dart';

@freezed
abstract class Attachment with _$Attachment {
  const factory Attachment({
    @JsonKey(name: 'file_id') required String fileId,
    required String kind,
  }) = _Attachment;

  factory Attachment.fromJson(Map<String, Object?> json) =>
      _$AttachmentFromJson(json);
}
