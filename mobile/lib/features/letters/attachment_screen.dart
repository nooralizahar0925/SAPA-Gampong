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
      subtitle: 'Langkah 3 dari 5',
      leading: const SapaBackButton(),
      body: ListView(
        children: [
          const Text(
            'Unggah lampiran',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          const Text(
            'Simulasi frontend: ketuk lampiran untuk menandai terunggah.',
          ),
          const SizedBox(height: 16),
          for (final kind in requiredKinds)
            _AttachmentTile(
              key: Key('attachment-$kind'),
              kind: kind,
              uploaded: uploadedKinds.contains(kind),
              onTap: () => setState(() => uploadedKinds.add(kind)),
            ),
          const SizedBox(height: 10),
          const Text(
            'Format: foto atau PDF, maksimal 5 MB per berkas.',
            style: TextStyle(color: Color(0xFF667069)),
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
    return Card(
      child: ListTile(
        onTap: uploaded ? null : onTap,
        leading: Icon(
          uploaded ? Icons.check_circle : Icons.upload_file_outlined,
          color: uploaded ? AppTheme.villageGreen : const Color(0xFF667069),
        ),
        title: Text('Lampiran $kind'),
        subtitle: Text(
          uploaded ? '$kind berhasil diunggah' : 'Ketuk untuk unggah $kind',
        ),
        trailing: uploaded ? const Text('Selesai') : const Icon(Icons.add),
      ),
    );
  }
}
