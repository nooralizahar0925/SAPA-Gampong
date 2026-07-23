import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

enum AttachmentPickSource { camera, gallery, pdf }

class PickedAttachmentFile {
  const PickedAttachmentFile({
    required this.name,
    required this.sizeBytes,
    this.path,
    this.bytes,
    this.mimeType,
  });

  final String name;
  final int sizeBytes;
  final String? path;
  final Uint8List? bytes;
  final String? mimeType;
}

class AttachmentFilePickerService {
  AttachmentFilePickerService({ImagePicker? imagePicker})
    : _imagePicker = imagePicker ?? ImagePicker();

  final ImagePicker _imagePicker;

  Future<PickedAttachmentFile?> pick(AttachmentPickSource source) async {
    if (source == AttachmentPickSource.pdf) {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
        withData: kIsWeb,
      );
      final file = result?.files.single;
      if (file == null) return null;
      return PickedAttachmentFile(
        name: file.name,
        sizeBytes: file.size,
        path: file.path,
        bytes: file.bytes,
        mimeType: 'application/pdf',
      );
    }

    final xfile = await _imagePicker.pickImage(
      source: source == AttachmentPickSource.camera
          ? ImageSource.camera
          : ImageSource.gallery,
      imageQuality: 75,
      maxWidth: 1920,
    );
    if (xfile == null) return null;
    final bytes = kIsWeb ? await xfile.readAsBytes() : null;
    return PickedAttachmentFile(
      name: xfile.name,
      sizeBytes: await xfile.length(),
      path: kIsWeb ? null : xfile.path,
      bytes: bytes,
      mimeType: xfile.mimeType,
    );
  }
}
