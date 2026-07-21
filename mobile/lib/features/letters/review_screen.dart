import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
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
    return SapaScaffold(
      title: 'Tinjau & Konfirmasi',
      subtitle: 'Langkah 5 dari 5',
      leading: const SapaBackButton(),
      padding: EdgeInsets.zero,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          StepHeader(step: 5, code: widget.flowDraft.letterType.code),
          const Text(
            'Periksa permohonan',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          const Text(
            'Pastikan semua data sudah benar sebelum dikirim.',
            style: TextStyle(color: AppTheme.ink500),
          ),
          const SizedBox(height: 16),
          // Email warning alert
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.sky100,
              border: Border.all(color: AppTheme.sky500),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.mail_outline,
                  size: 18,
                  color: AppTheme.sky500,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.sky500,
                        fontWeight: FontWeight.w600,
                      ),
                      children: [
                        const TextSpan(text: 'Pastikan email benar. Surat akan dikirim ke '),
                        TextSpan(
                          text: widget.flowDraft.applicantEmail,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Pemohon section
          const SectionTitle('Pemohon'),
          _GroupedCard(
            rows: [
              _RowData('Nama', widget.flowDraft.applicantName),
              _RowData('Email', widget.flowDraft.applicantEmail),
              _RowData('No. HP', widget.flowDraft.applicantPhone),
            ],
          ),
          // Data Surat section
          const SectionTitle('Data Surat'),
          _GroupedCard(
            rows: [
              for (final field in widget.flowDraft.letterType.fields)
                _RowData(
                  field.label,
                  widget.flowDraft.subjectData[field.key] ?? '-',
                ),
            ],
          ),
          // Lampiran section
          const SectionTitle('Lampiran'),
          _GroupedCard(
            rows: [
              for (final attachment in widget.flowDraft.attachments)
                _RowData(attachment.kind, 'Terlampir'),
            ],
          ),
          const SizedBox(height: 12),
          // Confirmation checkbox for all letter types
          Card(
            child: CheckboxListTile(
              value: confirmed,
              onChanged: (value) => setState(() => confirmed = value ?? false),
              title: const Text(
                'Saya menyatakan bahwa data yang saya isi adalah benar dan dapat dipertanggungjawabkan.',
                style: TextStyle(fontSize: 13, height: 1.4),
              ),
              controlAffinity: ListTileControlAffinity.leading,
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            key: const Key('review-submit'),
            onPressed: confirmed
                ? () => context.pushNamed(
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

class _RowData {
  const _RowData(this.label, this.value);

  final String label;
  final String value;
}

class _GroupedCard extends StatelessWidget {
  const _GroupedCard({required this.rows});

  final List<_RowData> rows;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      rows[i].label,
                      style: const TextStyle(color: AppTheme.ink500),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      rows[i].value,
                      textAlign: TextAlign.right,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
            if (i < rows.length - 1)
              const Divider(height: 1, indent: 14, endIndent: 14),
          ],
        ],
      ),
    );
  }
}
