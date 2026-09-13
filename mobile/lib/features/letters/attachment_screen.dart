import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/attachment.dart';
import '../../data/providers/letter_providers.dart';
import '../../data/services/attachment_file_picker_service.dart';
import 'letter_form_screen.dart';

class AttachmentScreen extends ConsumerStatefulWidget {
  const AttachmentScreen({super.key, required this.flowDraft});

  final LetterFlowDraft flowDraft;

  @override
  ConsumerState<AttachmentScreen> createState() => _AttachmentScreenState();
}

class _AttachmentScreenState extends ConsumerState<AttachmentScreen> {
  static const _supportedKinds = ['KTP'];

  late final Map<String, Attachment> _uploaded = {
    for (final a in widget.flowDraft.attachments)
      if (_supportedKinds.contains(a.kind)) a.kind: a,
  };
  final Set<String> _uploading = {};
  final Map<String, int> _fileSizes = {};

  @override
  Widget build(BuildContext context) {
    final requiredKinds = widget.flowDraft.letterType.requiredAttachments
        .where(_supportedKinds.contains)
        .toList();
    final optionalKinds = _supportedKinds
        .where((kind) => !requiredKinds.contains(kind))
        .toList();
    final complete = requiredKinds.every(_uploaded.containsKey);

    return SapaScaffold(
      title: widget.flowDraft.letterType.name,
      subtitle: widget.flowDraft.isCorrection
          ? 'Perbaikan data'
          : 'Langkah 4 dari 5',
      leading: const SapaBackButton(),
      padding: EdgeInsets.zero,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          StepHeader(step: 4, code: widget.flowDraft.letterType.code),
          const Text(
            'Unggah lampiran',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Pastikan foto jelas dan dokumen terbaca dengan baik.',
            style: TextStyle(color: AppTheme.g100),
          ),
          const SizedBox(height: 16),
          for (final kind in requiredKinds)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _AttachmentTile(
                key: Key('attachment-$kind'),
                kind: kind,
                required: true,
                uploaded: _uploaded.containsKey(kind),
                uploading: _uploading.contains(kind),
                fileSizeBytes: _fileSizes[kind],
                onTap: _uploading.contains(kind)
                    ? null
                    : () => _pickAndUpload(kind),
              ),
            ),
          for (final kind in optionalKinds)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _AttachmentTile(
                key: Key('attachment-$kind'),
                kind: kind,
                required: false,
                uploaded: _uploaded.containsKey(kind),
                uploading: _uploading.contains(kind),
                fileSizeBytes: _fileSizes[kind],
                onTap: _uploading.contains(kind)
                    ? null
                    : () => _pickAndUpload(kind),
              ),
            ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.cardGold,
              border: Border.all(color: AppTheme.gold500),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.lightbulb_outline, size: 16, color: AppTheme.g700),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Foto kurang jelas? Ambil di tempat terang atau gunakan flash. Format: foto atau PDF, maks. 5 MB.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.g700,
                      fontWeight: FontWeight.w600,
                      height: 1.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            key: const Key('attachments-next'),
            onPressed: complete ? _next : null,
            icon: const Icon(Icons.arrow_forward),
            label: const Text('Selanjutnya'),
          ),
        ],
      ),
    );
  }

  void _next() {
    context.pushNamed(
      AppRouteNames.review,
      extra: widget.flowDraft.copyWith(attachments: _uploaded.values.toList()),
    );
  }

  Future<void> _pickAndUpload(String kind) async {
    final source = await _showPickerSheet();
    if (source == null || !mounted) return;

    PickedAttachmentFile? file;
    try {
      file = await ref.read(attachmentFilePickerProvider).pick(source);
      if (file == null) return;
    } catch (_) {
      return;
    }

    if (!mounted) return;

    final sizeBytes = file.sizeBytes;
    if (sizeBytes > 5 * 1024 * 1024) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('File terlalu besar. Maks. 5 MB.')),
        );
      }
      return;
    }

    setState(() => _uploading.add(kind));
    try {
      final attachment = await ref
          .read(uploadServiceProvider)
          .upload(file, kind);
      if (mounted) {
        setState(() {
          _uploaded[kind] = attachment;
          _fileSizes[kind] = sizeBytes;
          _uploading.remove(kind);
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _uploading.remove(kind));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal mengunggah $kind. Coba lagi.')),
        );
      }
    }
  }

  Future<AttachmentPickSource?> _showPickerSheet() {
    return showModalBottomSheet<AttachmentPickSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt_outlined),
                title: const Text('Kamera'),
                onTap: () => Navigator.pop(ctx, AttachmentPickSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined),
                title: const Text('Galeri'),
                onTap: () => Navigator.pop(ctx, AttachmentPickSource.gallery),
              ),
              ListTile(
                leading: const Icon(Icons.picture_as_pdf_outlined),
                title: const Text('PDF'),
                onTap: () => Navigator.pop(ctx, AttachmentPickSource.pdf),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AttachmentTile extends StatelessWidget {
  const _AttachmentTile({
    super.key,
    required this.kind,
    required this.required,
    required this.uploaded,
    required this.uploading,
    required this.onTap,
    this.fileSizeBytes,
  });

  final String kind;
  final bool required;
  final bool uploaded;
  final bool uploading;
  final VoidCallback? onTap;
  final int? fileSizeBytes;

  @override
  Widget build(BuildContext context) {
    if (uploading) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: AppTheme.g300),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: AppTheme.g100,
                borderRadius: BorderRadius.circular(10),
              ),
              alignment: Alignment.center,
              child: const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const Text(
                  'Sedang mengunggah…',
                  style: TextStyle(fontSize: 12, color: AppTheme.ink500),
                ),
              ],
            ),
          ],
        ),
      );
    }

    if (uploaded) {
      return Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              border: Border.all(color: AppTheme.ok),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: AppTheme.okBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.insert_drive_file_outlined,
                    color: AppTheme.ok,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _title,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      Text(
                        '${_formatFileSize(fileSizeBytes ?? 0)} · terunggah',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.ok,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Ketuk untuk ganti berkas',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppTheme.ink500,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_circle, color: AppTheme.ok),
                    SizedBox(height: 4),
                    Icon(
                      Icons.swap_horiz_outlined,
                      color: AppTheme.ink500,
                      size: 20,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.g50,
          border: Border.all(color: AppTheme.g300, width: 1.5),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: AppTheme.g100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.upload_file_outlined,
                color: AppTheme.g700,
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AppTheme.ink700,
                  ),
                ),
                Text(
                  required
                      ? 'Ketuk untuk memilih berkas'
                      : 'Opsional, unggah bila tersedia',
                  style: const TextStyle(fontSize: 12, color: AppTheme.ink500),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String get _title => required ? 'Lampiran $kind *' : 'Lampiran $kind';

  String _formatFileSize(int bytes) {
    if (bytes == 0) return '';
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    }
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
