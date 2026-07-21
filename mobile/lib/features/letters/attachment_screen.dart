import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/attachment.dart';
import 'letter_form_screen.dart';

class AttachmentScreen extends StatefulWidget {
  const AttachmentScreen({super.key, required this.flowDraft});

  final LetterFlowDraft flowDraft;

  @override
  State<AttachmentScreen> createState() => _AttachmentScreenState();
}

class _AttachmentScreenState extends State<AttachmentScreen> {
  late final Set<String> uploadedKinds = {
    for (final attachment in widget.flowDraft.attachments) attachment.kind,
  };

  @override
  Widget build(BuildContext context) {
    final requiredKinds = widget.flowDraft.letterType.requiredAttachments;
    final complete = requiredKinds.every(uploadedKinds.contains);

    return SapaScaffold(
      title: widget.flowDraft.letterType.name,
      subtitle: 'Langkah 4 dari 5',
      leading: const SapaBackButton(),
      padding: EdgeInsets.zero,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          StepHeader(step: 4, code: widget.flowDraft.letterType.code),
          const Text(
            'Unggah lampiran',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          const Text(
            'Pastikan foto jelas dan dokumen terbaca dengan baik.',
            style: TextStyle(color: AppTheme.ink500),
          ),
          const SizedBox(height: 16),
          for (final kind in requiredKinds)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _AttachmentTile(
                key: Key('attachment-$kind'),
                kind: kind,
                uploaded: uploadedKinds.contains(kind),
                onTap: () => setState(() => uploadedKinds.add(kind)),
              ),
            ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.g50,
              border: Border.all(color: AppTheme.g300),
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
            onPressed: complete
                ? () {
                    final attachments = uploadedKinds
                        .map(
                          (kind) => Attachment(
                            fileId: 'mock_${kind.toLowerCase()}',
                            kind: kind,
                          ),
                        )
                        .toList();
                    context.pushNamed(
                      AppRouteNames.review,
                      extra: widget.flowDraft.copyWith(
                        attachments: attachments,
                      ),
                    );
                  }
                : null,
            icon: const Icon(Icons.arrow_forward),
            label: const Text('Selanjutnya'),
          ),
        ],
      ),
    );
  }
}

class _AttachmentTile extends StatelessWidget {
  const _AttachmentTile({
    super.key,
    required this.kind,
    required this.uploaded,
    required this.onTap,
  });

  final String kind;
  final bool uploaded;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    if (uploaded) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
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
                    'Lampiran $kind',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const Text(
                    '1,2 MB · terunggah',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.ok,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.check_circle, color: AppTheme.ok),
          ],
        ),
      );
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.g50,
          border: Border.all(
            color: AppTheme.g300,
            width: 1.5,
          ),
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
                  'Lampiran $kind',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AppTheme.ink700,
                  ),
                ),
                const Text(
                  'Ketuk untuk memilih berkas',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.ink500,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
