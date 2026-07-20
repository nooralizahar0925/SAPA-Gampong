import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/widgets/sapa_scaffold.dart';
import 'letter_form_screen.dart';

class ReviewScreen extends StatefulWidget {
  const ReviewScreen({super.key, required this.flowDraft});

  final LetterFlowDraft flowDraft;

  @override
  State<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends State<ReviewScreen> {
  late bool confirmed = widget.flowDraft.falseStatementConfirmed;

  @override
  Widget build(BuildContext context) {
    final needsConfirmation = widget.flowDraft.letterType.code == 'L3';
    final canSubmit = !needsConfirmation || confirmed;

    return SapaScaffold(
      title: widget.flowDraft.letterType.name,
      subtitle: 'Langkah 4 dari 5',
      leading: const BackButton(),
      body: ListView(
        children: [
          const Text(
            'Periksa permohonan',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          const Text('Pastikan data dan email sudah benar sebelum dikirim.'),
          const SectionTitle('Pemohon'),
          _ReviewRow('Nama', widget.flowDraft.applicantName),
          _ReviewRow('Email', widget.flowDraft.applicantEmail),
          _ReviewRow('No. HP', widget.flowDraft.applicantPhone),
          const SectionTitle('Data Surat'),
          for (final field in widget.flowDraft.letterType.fields)
            _ReviewRow(
              field.label,
              widget.flowDraft.subjectData[field.key] ?? '-',
            ),
          const SectionTitle('Lampiran'),
          for (final attachment in widget.flowDraft.attachments)
            _ReviewRow(attachment.kind, attachment.fileId),
          if (needsConfirmation)
            CheckboxListTile(
              value: confirmed,
              onChanged: (value) => setState(() => confirmed = value ?? false),
              title: const Text(
                'Saya bertanggung jawab atas kebenaran laporan kehilangan ini.',
              ),
              controlAffinity: ListTileControlAffinity.leading,
            ),
          const SizedBox(height: 16),
          FilledButton.icon(
            key: const Key('review-submit'),
            onPressed: canSubmit
                ? () => context.goNamed(
                    AppRouteNames.success,
                    extra: widget.flowDraft.copyWith(
                      falseStatementConfirmed: confirmed,
                    ),
                  )
                : null,
            icon: const Icon(Icons.send_outlined),
            label: const Text('Ajukan Permohonan'),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: () => context.goNamed(
              AppRouteNames.letterForm,
              pathParameters: {'code': widget.flowDraft.letterType.code},
            ),
            child: const Text('Ubah Data'),
          ),
        ],
      ),
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                label,
                style: const TextStyle(color: Color(0xFF667069)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                value,
                textAlign: TextAlign.right,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
