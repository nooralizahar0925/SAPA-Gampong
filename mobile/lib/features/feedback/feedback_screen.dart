import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/validators.dart';
import '../../core/widgets/resident_email_gate.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/attachment.dart';
import '../../data/models/feedback_model.dart';
import '../../data/providers/feedback_providers.dart';
import '../../data/providers/letter_providers.dart';
import '../../data/providers/resident_providers.dart';
import '../../data/providers/submission_queue_providers.dart';
import '../../data/services/attachment_file_picker_service.dart';

class FeedbackScreen extends ConsumerStatefulWidget {
  const FeedbackScreen({super.key});

  @override
  ConsumerState<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends ConsumerState<FeedbackScreen> {
  final formKey = GlobalKey<FormState>();
  final name = TextEditingController();
  final phone = TextEditingController();
  final body = TextEditingController();
  bool sent = false;
  bool submitting = false;
  bool uploadingAttachment = false;
  String? referenceCode;
  final List<Attachment> attachments = [];
  final Map<String, int> attachmentSizes = {};

  @override
  void dispose() {
    name.dispose();
    phone.dispose();
    body.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Pelaporan Warga',
      subtitle: 'Sampaikan ke kantor keuchik',
      leading: const SapaBackButton(),
      body: ResidentEmailGate(
        message:
            'Verifikasi email terlebih dahulu agar laporan terhubung ke riwayat Anda.',
        child: sent ? _success(context) : _form(),
      ),
    );
  }

  Widget _form() {
    final session = ref.watch(residentSessionProvider).asData?.value;
    return Form(
      key: formKey,
      child: ListView(
        children: [
          TextFormField(
            controller: name,
            decoration: const InputDecoration(labelText: 'Nama Lengkap'),
            validator: Validators.required,
          ),
          const SizedBox(height: 12),
          InputDecorator(
            decoration: const InputDecoration(
              labelText: 'Alamat Email',
              helperText: 'Email ini sudah terverifikasi.',
            ),
            child: Text(
              session?.email ?? '-',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: phone,
            decoration: const InputDecoration(labelText: 'No. HP'),
            validator: Validators.phone,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: body,
            decoration: const InputDecoration(labelText: 'Isi Laporan'),
            validator: Validators.required,
            maxLines: 5,
          ),
          const SizedBox(height: 12),
          _FeedbackAttachmentPicker(
            attachments: attachments,
            fileSizes: attachmentSizes,
            uploading: uploadingAttachment,
            onAdd: uploadingAttachment ? null : _pickAndUploadAttachment,
            onRemove: uploadingAttachment ? null : _removeAttachment,
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            key: const Key('feedback-submit'),
            onPressed: (submitting || uploadingAttachment) ? null : _submit,
            icon: submitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.send_outlined),
            label: Text(submitting ? 'Mengirim...' : 'Kirim Laporan'),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    if (!(formKey.currentState?.validate() ?? false)) return;

    setState(() => submitting = true);
    final draft = FeedbackDraft(
      name: name.text.trim(),
      email: ref.read(residentSessionProvider).asData?.value?.email ?? '',
      phone: phone.text.trim().isEmpty ? null : phone.text.trim(),
      body: body.text.trim(),
      attachments: List.unmodifiable(attachments),
    );

    try {
      final result = await ref.read(feedbackRepositoryProvider).submit(draft);
      if (!mounted) return;
      setState(() {
        sent = true;
        submitting = false;
        referenceCode = result.referenceCode;
      });
      ref.invalidate(residentFeedbackProvider);
    } catch (_) {
      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      await ref.read(submissionQueueProvider).enqueueFeedback(draft.toJson());
      setState(() => submitting = false);
      messenger.showSnackBar(
        const SnackBar(
          content: Text(
            'Koneksi bermasalah. Laporan disimpan offline dan akan dikirim otomatis.',
          ),
        ),
      );
    }
  }

  Future<void> _pickAndUploadAttachment() async {
    final source = await _showPickerSheet();
    if (source == null || !mounted) return;

    PickedAttachmentFile? file;
    try {
      file = await ref.read(attachmentFilePickerProvider).pick(source);
      if (file == null) return;
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('File belum bisa dipilih. Coba lagi.')),
      );
      return;
    }

    final sizeBytes = file.sizeBytes;
    if (sizeBytes > 5 * 1024 * 1024) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('File terlalu besar. Maks. 5 MB.')),
      );
      return;
    }

    setState(() => uploadingAttachment = true);
    try {
      final attachment = await ref
          .read(uploadServiceProvider)
          .upload(file, _attachmentKind(source));
      if (!mounted) return;
      setState(() {
        attachments.add(attachment);
        attachmentSizes[attachment.fileId] = sizeBytes;
        uploadingAttachment = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => uploadingAttachment = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal mengunggah lampiran. Coba lagi.')),
      );
    }
  }

  void _removeAttachment(Attachment attachment) {
    setState(() {
      attachments.removeWhere((item) => item.fileId == attachment.fileId);
      attachmentSizes.remove(attachment.fileId);
    });
  }

  Future<AttachmentPickSource?> _showPickerSheet() {
    return showModalBottomSheet<AttachmentPickSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              key: const Key('feedback-attachment-camera'),
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('Kamera'),
              onTap: () => Navigator.pop(ctx, AttachmentPickSource.camera),
            ),
            ListTile(
              key: const Key('feedback-attachment-gallery'),
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Galeri'),
              onTap: () => Navigator.pop(ctx, AttachmentPickSource.gallery),
            ),
            ListTile(
              key: const Key('feedback-attachment-pdf'),
              leading: const Icon(Icons.picture_as_pdf_outlined),
              title: const Text('PDF'),
              onTap: () => Navigator.pop(ctx, AttachmentPickSource.pdf),
            ),
          ],
        ),
      ),
    );
  }

  Widget _success(BuildContext context) {
    final session = ref.watch(residentSessionProvider).asData?.value;
    return ListView(
      children: [
        const SizedBox(height: 42),
        Center(
          child: Container(
            width: 92,
            height: 92,
            decoration: BoxDecoration(
              color: AppTheme.okBg,
              borderRadius: BorderRadius.circular(30),
            ),
            child: const Icon(Icons.check, size: 52, color: AppTheme.ok),
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'Laporan telah dikirim',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Laporan Anda akan ditindaklanjuti melalui email ${session?.email ?? '-'} dalam waktu maksimal 3×24 jam.',
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppTheme.g100, height: 1.5),
        ),
        const SizedBox(height: 22),
        // Report reference code card
        Card(
          color: AppTheme.g50,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                const Text(
                  'Kode Laporan',
                  style: TextStyle(
                    color: AppTheme.ink500,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  referenceCode ?? '-',
                  key: const Key('feedback-reference-code'),
                  style: const TextStyle(
                    color: AppTheme.villageGreen,
                    fontSize: 28,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 2,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Info alert
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.g50,
            border: Border.all(color: AppTheme.g300),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Row(
            children: [
              Icon(Icons.info_outline, size: 18, color: AppTheme.g700),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Diterima kantor keuchik. Simpan kode laporan untuk referensi.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppTheme.g700,
                    fontWeight: FontWeight.w600,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),
        OutlinedButton.icon(
          onPressed: () => context.goNamed(AppRouteNames.myFeedback),
          icon: const Icon(Icons.campaign_outlined),
          label: const Text('Lihat Laporan Saya'),
        ),
        const SizedBox(height: 10),
        FilledButton(
          onPressed: () => context.goNamed(AppRouteNames.home),
          child: const Text('Kembali ke Beranda'),
        ),
      ],
    );
  }
}

class _FeedbackAttachmentPicker extends StatelessWidget {
  const _FeedbackAttachmentPicker({
    required this.attachments,
    required this.fileSizes,
    required this.uploading,
    required this.onAdd,
    required this.onRemove,
  });

  final List<Attachment> attachments;
  final Map<String, int> fileSizes;
  final bool uploading;
  final VoidCallback? onAdd;
  final ValueChanged<Attachment>? onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppTheme.line),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: AppTheme.ink900.withAlpha(10),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppTheme.g100,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.attach_file, color: AppTheme.g700),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Lampiran',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 3),
                    const Text(
                      'Tambahkan foto atau PDF pendukung bila ada.',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.ink500,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${attachments.length} berkas · maks. 5 MB per berkas',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme.g700,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (attachments.isNotEmpty || uploading) const SizedBox(height: 12),
          for (final attachment in attachments)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _UploadedFeedbackAttachment(
                attachment: attachment,
                fileSizeBytes: fileSizes[attachment.fileId],
                onRemove: onRemove == null ? null : () => onRemove!(attachment),
              ),
            ),
          if (uploading)
            const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: _UploadingFeedbackAttachment(),
            ),
          const SizedBox(height: 2),
          _FeedbackAttachmentAddButton(uploading: uploading, onTap: onAdd),
        ],
      ),
    );
  }
}

class _FeedbackAttachmentAddButton extends StatelessWidget {
  const _FeedbackAttachmentAddButton({required this.uploading, this.onTap});

  final bool uploading;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppTheme.g50,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        key: const Key('feedback-attachment-add'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border.all(color: AppTheme.g300),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: uploading
                    ? const Padding(
                        padding: EdgeInsets.all(8),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(
                        Icons.add_photo_alternate_outlined,
                        size: 20,
                        color: AppTheme.g700,
                      ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      uploading ? 'Mengunggah lampiran...' : 'Tambah lampiran',
                      style: const TextStyle(
                        color: AppTheme.g700,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Kamera, galeri, atau PDF',
                      style: TextStyle(fontSize: 11, color: AppTheme.ink500),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, size: 22, color: AppTheme.ink500),
            ],
          ),
        ),
      ),
    );
  }
}

class _UploadedFeedbackAttachment extends StatelessWidget {
  const _UploadedFeedbackAttachment({
    required this.attachment,
    this.onRemove,
    this.fileSizeBytes,
  });

  final Attachment attachment;
  final VoidCallback? onRemove;
  final int? fileSizeBytes;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: Key('feedback-attachment-${attachment.fileId}'),
      padding: const EdgeInsets.fromLTRB(10, 9, 6, 9),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppTheme.g300),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: AppTheme.g50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              attachment.kind == 'photo'
                  ? Icons.image_outlined
                  : Icons.picture_as_pdf_outlined,
              size: 19,
              color: AppTheme.g700,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  attachment.kind == 'photo' ? 'Foto laporan' : 'Dokumen PDF',
                  style: const TextStyle(
                    color: AppTheme.ink700,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${_formatFileSize(fileSizeBytes ?? 0)} · terunggah',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.g700,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.okBg,
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text(
              'Siap',
              style: TextStyle(
                color: AppTheme.ok,
                fontSize: 10,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          IconButton(
            tooltip: 'Hapus lampiran',
            onPressed: onRemove,
            constraints: const BoxConstraints.tightFor(width: 36, height: 36),
            padding: EdgeInsets.zero,
            icon: const Icon(Icons.close, size: 18),
          ),
        ],
      ),
    );
  }
}

class _UploadingFeedbackAttachment extends StatelessWidget {
  const _UploadingFeedbackAttachment();

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('feedback-attachment-uploading'),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.g50,
        border: Border.all(color: AppTheme.g300),
        borderRadius: BorderRadius.circular(10),
      ),
      child: const Row(
        children: [
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          SizedBox(width: 10),
          Text(
            'Sedang mengunggah lampiran...',
            style: TextStyle(
              fontSize: 12,
              color: AppTheme.ink500,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

String _attachmentKind(AttachmentPickSource source) {
  return source == AttachmentPickSource.pdf ? 'document' : 'photo';
}

String _formatFileSize(int bytes) {
  if (bytes == 0) return 'terunggah';
  if (bytes < 1024) return '$bytes B';
  if (bytes < 1024 * 1024) {
    return '${(bytes / 1024).toStringAsFixed(1)} KB';
  }
  return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
}
