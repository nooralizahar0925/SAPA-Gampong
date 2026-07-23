import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import 'letter_form_screen.dart';

class PurposeScreen extends StatefulWidget {
  const PurposeScreen({super.key, required this.flowDraft});

  final LetterFlowDraft flowDraft;

  @override
  State<PurposeScreen> createState() => _PurposeScreenState();
}

class _PurposeScreenState extends State<PurposeScreen> {
  static const _quickPicks = [
    'Beasiswa',
    'Pendidikan',
    'Kesehatan',
    'Bantuan Sosial',
  ];

  String? _selected;
  final _notesController = TextEditingController();
  int _noteLen = 0;

  @override
  void initState() {
    super.initState();
    _notesController.addListener(
      () => setState(() => _noteLen = _notesController.text.length),
    );
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: widget.flowDraft.letterType.name,
      subtitle: 'Langkah 3 dari 5',
      leading: const SapaBackButton(),
      padding: EdgeInsets.zero,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          StepHeader(step: 3, code: widget.flowDraft.letterType.code),
          const Text(
            'Tujuan Surat',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          const Text(
            'Pilih tujuan penggunaan surat keterangan ini.',
            style: TextStyle(color: AppTheme.ink500),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: _quickPicks
                .map((label) => _QuickPick(
                      label: label,
                      selected: _selected == label,
                      onTap: () => setState(() => _selected = label),
                    ))
                .toList(),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.g50,
              border: Border.all(color: AppTheme.g300),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: const [
                Icon(Icons.info_outline, size: 16, color: AppTheme.g700),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Tujuan tercetak pada surat resmi.',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppTheme.g700,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _notesController,
            maxLines: 4,
            maxLength: 200,
            decoration: InputDecoration(
              labelText: 'Keterangan Tambahan (opsional)',
              alignLabelWithHint: true,
              counterText: '$_noteLen / 200',
            ),
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: () {
              final notes = _notesController.text.trim();
              final String? keperluan;
              if (_selected != null && notes.isNotEmpty) {
                keperluan = '$_selected — $notes';
              } else if (_selected != null) {
                keperluan = _selected;
              } else if (notes.isNotEmpty) {
                keperluan = notes;
              } else {
                keperluan = null;
              }
              context.pushNamed(
                AppRouteNames.attachments,
                extra: widget.flowDraft.copyWith(keperluan: keperluan),
              );
            },
            icon: const Icon(Icons.arrow_forward),
            label: const Text('Selanjutnya'),
          ),
        ],
      ),
    );
  }
}

class _QuickPick extends StatelessWidget {
  const _QuickPick({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppTheme.g800 : Colors.white,
          border: Border.all(
            color: selected ? AppTheme.g800 : AppTheme.line,
          ),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AppTheme.ink700,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
