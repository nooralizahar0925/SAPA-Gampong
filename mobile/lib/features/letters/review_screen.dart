import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/letter_request.dart';
import '../../data/providers/letter_providers.dart';
import '../../data/providers/resident_providers.dart';
import '../../data/providers/submission_queue_providers.dart';
import 'letter_form_screen.dart';

class ReviewScreen extends ConsumerStatefulWidget {
  const ReviewScreen({super.key, required this.flowDraft});

  final LetterFlowDraft flowDraft;

  @override
  ConsumerState<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends ConsumerState<ReviewScreen> {
  late bool _confirmed = widget.flowDraft.falseStatementConfirmed;
  bool _submitting = false;

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Tinjau & Konfirmasi',
      subtitle: widget.flowDraft.isCorrection
          ? 'Perbaikan data'
          : 'Langkah 5 dari 5',
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
                        const TextSpan(
                          text: 'Pastikan email benar. Surat akan dikirim ke ',
                        ),
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
          const SectionTitle('Pemohon'),
          _GroupedCard(
            rows: [
              _RowData('Nama', widget.flowDraft.applicantName),
              _RowData('Email', widget.flowDraft.applicantEmail),
              _RowData('No. HP', widget.flowDraft.applicantPhone),
            ],
          ),
          if (widget.flowDraft.keperluan != null) ...[
            const SectionTitle('Tujuan Surat'),
            _GroupedCard(
              rows: [_RowData('Keperluan', widget.flowDraft.keperluan!)],
            ),
          ],
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
          const SectionTitle('Lampiran'),
          _GroupedCard(
            rows: [
              for (final attachment in widget.flowDraft.attachments)
                _RowData(attachment.kind, 'Terlampir'),
            ],
          ),
          const SizedBox(height: 12),
          Card(
            child: CheckboxListTile(
              value: _confirmed,
              onChanged: _submitting
                  ? null
                  : (value) => setState(() => _confirmed = value ?? false),
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
            onPressed: (_confirmed && !_submitting) ? _submit : null,
            icon: _submitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.send_outlined),
            label: Text(
              widget.flowDraft.isCorrection
                  ? 'Kirim Perbaikan'
                  : 'Ajukan Permohonan',
            ),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: _submitting
                ? null
                : () => context.goNamed(
                    AppRouteNames.letterForm,
                    extra: widget.flowDraft.letterType,
                  ),
            child: const Text('Ubah Data'),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);

    final requestDraft = LetterRequestDraft(
      letterType: widget.flowDraft.letterType.code,
      applicantName: widget.flowDraft.applicantName,
      applicantEmail: widget.flowDraft.applicantEmail,
      applicantPhone: widget.flowDraft.applicantPhone,
      keperluan: widget.flowDraft.keperluan,
      subjectData: Map<String, Object?>.from(widget.flowDraft.subjectData),
      attachments: widget.flowDraft.attachments,
    );

    try {
      final correctionId = widget.flowDraft.requestId;
      final result = correctionId == null
          ? await ref.read(letterRepositoryProvider).submit(requestDraft)
          : await _resubmitCorrection(correctionId, requestDraft);
      if (!mounted) return;
      ref.invalidate(residentRequestsProvider);
      context.pushNamed(
        AppRouteNames.success,
        extra: widget.flowDraft.copyWith(
          falseStatementConfirmed: true,
          referenceCode: result.referenceCode,
        ),
      );
    } catch (_) {
      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      setState(() => _submitting = false);
      if (widget.flowDraft.isCorrection) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Perbaikan belum bisa dikirim. Coba lagi.'),
          ),
        );
        return;
      }

      await ref
          .read(submissionQueueProvider)
          .enqueueLetter(requestDraft.toJson());
      messenger.showSnackBar(
        const SnackBar(
          content: Text(
            'Koneksi bermasalah. Permohonan disimpan offline dan akan dikirim otomatis.',
          ),
        ),
      );
    }
  }

  Future<CreatedRequest> _resubmitCorrection(
    String requestId,
    LetterRequestDraft requestDraft,
  ) async {
    final session = await ref.read(residentSessionProvider.future);
    if (session == null) throw StateError('Resident email session required');
    final corrected = await ref
        .read(residentRepositoryProvider)
        .resubmitRequest(session: session, id: requestId, draft: requestDraft);
    return CreatedRequest(
      id: corrected.id,
      referenceCode: corrected.referenceCode,
      status: corrected.status,
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
