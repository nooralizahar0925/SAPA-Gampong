import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';

import '../../core/network/dio_client.dart';
import '../models/attachment.dart';
import '../models/upload_result.dart';
import 'attachment_file_picker_service.dart';

class UploadService {
  UploadService(this._client);

  final DioClient _client;

  Future<Attachment> upload(PickedAttachmentFile file, String kind) async {
    final contentType = _contentTypeFor(file);
    final multipartFile = file.bytes != null
        ? MultipartFile.fromBytes(
            file.bytes!,
            filename: file.name,
            contentType: contentType,
          )
        : file.path != null
        ? await MultipartFile.fromFile(
            file.path!,
            filename: file.name,
            contentType: contentType,
          )
        : throw StateError('Picked file has no bytes or path');

    final formData = FormData.fromMap({'file': multipartFile, 'kind': kind});

    final res = await _client.dio.post<Map<String, Object?>>(
      '/uploads',
      data: formData,
    );
    final result = UploadResult.fromJson(res.data!);
    return Attachment(fileId: result.fileId, kind: kind);
  }

  MediaType? _contentTypeFor(PickedAttachmentFile file) {
    final provided = fileMimeType(file.mimeType);
    if (provided != null) return provided;
    final filename = file.name;
    final lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return MediaType('application', 'pdf');
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      return MediaType('image', 'jpeg');
    }
    if (lower.endsWith('.png')) return MediaType('image', 'png');
    if (lower.endsWith('.webp')) return MediaType('image', 'webp');
    if (lower.endsWith('.gif')) return MediaType('image', 'gif');
    if (lower.endsWith('.mp3')) return MediaType('audio', 'mpeg');
    if (lower.endsWith('.m4a')) return MediaType('audio', 'mp4');
    if (lower.endsWith('.ogg')) return MediaType('audio', 'ogg');
    if (lower.endsWith('.wav')) return MediaType('audio', 'wav');
    return null;
  }

  MediaType? fileMimeType(String? value) {
    if (value == null) return null;
    final parts = value.split('/');
    if (parts.length == 2 && parts.first.isNotEmpty && parts.last.isNotEmpty) {
      return MediaType(parts.first, parts.last);
    }
    return null;
  }
}
