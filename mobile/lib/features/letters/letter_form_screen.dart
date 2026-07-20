import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/validators.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/attachment.dart';
import '../../data/models/field_spec.dart';
import '../../data/models/letter_type.dart';

class LetterFlowDraft {
  const LetterFlowDraft({
    required this.letterType,
    required this.applicantName,
    required this.applicantEmail,
    required this.applicantPhone,
    required this.subjectData,
    this.attachments = const [],
    this.falseStatementConfirmed = false,
  });

  final LetterType letterType;
  final String applicantName;
  final String applicantEmail;
  final String applicantPhone;
  final Map<String, String> subjectData;
  final List<Attachment> attachments;
  final bool falseStatementConfirmed;

  LetterFlowDraft copyWith({
    List<Attachment>? attachments,
    bool? falseStatementConfirmed,
  }) {
    return LetterFlowDraft(
      letterType: letterType,
      applicantName: applicantName,
      applicantEmail: applicantEmail,
      applicantPhone: applicantPhone,
      subjectData: subjectData,
      attachments: attachments ?? this.attachments,
      falseStatementConfirmed:
          falseStatementConfirmed ?? this.falseStatementConfirmed,
    );
  }

  factory LetterFlowDraft.sample(LetterType letterType) {
    return LetterFlowDraft(
      letterType: letterType,
      applicantName: 'Roni Asra',
      applicantEmail: 'asra.roniasra@gmail.com',
      applicantPhone: '081234567890',
      subjectData: {
        for (final field in letterType.fields) field.key: _sampleValue(field),
      },
      attachments: const [
        Attachment(fileId: 'mock_ktp', kind: 'KTP'),
        Attachment(fileId: 'mock_kk', kind: 'KK'),
      ],
      falseStatementConfirmed: true,
    );
  }
}

class LetterFormScreen extends StatefulWidget {
  const LetterFormScreen({super.key, required this.letterType});

  final LetterType letterType;

  @override
  State<LetterFormScreen> createState() => _LetterFormScreenState();
}

class _LetterFormScreenState extends State<LetterFormScreen> {
  final formKey = GlobalKey<FormState>();
  final applicantName = TextEditingController(text: 'Roni Asra');
  final applicantEmail = TextEditingController(text: 'asra.roniasra@gmail.com');
  final applicantPhone = TextEditingController(text: '081234567890');
  final values = <String, TextEditingController>{};
  final enumValues = <String, String>{};

  @override
  void initState() {
    super.initState();
    for (final field in widget.letterType.fields) {
      if (field.type == FieldType.enumT) {
        enumValues[field.key] = _sampleValue(field);
      } else {
        values[field.key] = TextEditingController(text: _sampleValue(field));
      }
    }
  }

  @override
  void dispose() {
    applicantName.dispose();
    applicantEmail.dispose();
    applicantPhone.dispose();
    for (final controller in values.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: widget.letterType.name,
      subtitle: 'Langkah 2 dari 5',
      leading: const BackButton(),
      padding: EdgeInsets.zero,
      body: Form(
        key: formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _StepHeader(step: 2, code: widget.letterType.code),
            if (!widget.letterType.subjectIsApplicant)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(14),
                  child: Text(
                    'Pemohon dapat berbeda dari orang atau kantor yang diterangkan dalam surat ini.',
                  ),
                ),
              ),
            const SectionTitle('Data Pemohon'),
            TextFormField(
              controller: applicantName,
              decoration: const InputDecoration(labelText: 'Nama Pemohon'),
              validator: Validators.required,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: applicantEmail,
              decoration: const InputDecoration(
                labelText: 'Alamat Email',
                helperText: 'Surat jadi hanya dikirim ke email ini.',
              ),
              keyboardType: TextInputType.emailAddress,
              validator: Validators.email,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: applicantPhone,
              decoration: const InputDecoration(labelText: 'No. HP'),
              keyboardType: TextInputType.phone,
              validator: Validators.phone,
              textInputAction: TextInputAction.next,
            ),
            const SectionTitle('Data Surat'),
            for (final field in widget.letterType.fields) ...[
              _FieldInput(
                field: field,
                controller: values[field.key],
                value: enumValues[field.key],
                onChanged: (value) => setState(() {
                  if (value != null) enumValues[field.key] = value;
                }),
              ),
              const SizedBox(height: 12),
            ],
            const SizedBox(height: 8),
            FilledButton.icon(
              key: const Key('letter-form-next'),
              onPressed: _continue,
              icon: const Icon(Icons.arrow_forward),
              label: const Text('Selanjutnya'),
            ),
          ],
        ),
      ),
    );
  }

  void _continue() {
    if (!(formKey.currentState?.validate() ?? false)) {
      return;
    }

    final subjectData = <String, String>{};
    for (final field in widget.letterType.fields) {
      subjectData[field.key] = field.type == FieldType.enumT
          ? enumValues[field.key] ?? ''
          : values[field.key]?.text ?? '';
    }

    context.goNamed(
      AppRouteNames.attachments,
      extra: LetterFlowDraft(
        letterType: widget.letterType,
        applicantName: applicantName.text.trim(),
        applicantEmail: applicantEmail.text.trim(),
        applicantPhone: applicantPhone.text.trim(),
        subjectData: subjectData,
      ),
    );
  }
}

class _StepHeader extends StatelessWidget {
  const _StepHeader({required this.step, required this.code});

  final int step;
  final String code;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppTheme.villageGreen,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                code,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Text('Langkah $step dari 5'),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          children: List.generate(
            5,
            (index) => Expanded(
              child: Container(
                height: 4,
                margin: const EdgeInsets.only(right: 6),
                decoration: BoxDecoration(
                  color: index < step
                      ? AppTheme.villageGreen
                      : const Color(0xFFDCEDE4),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}

class _FieldInput extends StatelessWidget {
  const _FieldInput({
    required this.field,
    required this.controller,
    required this.value,
    required this.onChanged,
  });

  final FieldSpec field;
  final TextEditingController? controller;
  final String? value;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    if (field.type == FieldType.enumT) {
      return DropdownButtonFormField<String>(
        key: Key('field-${field.key}'),
        initialValue: value?.isEmpty == true ? null : value,
        decoration: InputDecoration(labelText: _label),
        items: field.options
            .map(
              (option) => DropdownMenuItem(value: option, child: Text(option)),
            )
            .toList(),
        onChanged: onChanged,
        validator: Validators.forField(field),
      );
    }

    return TextFormField(
      key: Key('field-${field.key}'),
      controller: controller,
      decoration: InputDecoration(labelText: _label),
      validator: Validators.forField(field),
      keyboardType: switch (field.type) {
        FieldType.nik ||
        FieldType.number ||
        FieldType.year => TextInputType.number,
        FieldType.phone => TextInputType.phone,
        FieldType.email => TextInputType.emailAddress,
        FieldType.textarea => TextInputType.multiline,
        _ => TextInputType.text,
      },
      maxLines: field.type == FieldType.textarea ? 4 : 1,
    );
  }

  String get _label => field.required ? '${field.label} *' : field.label;
}

String _sampleValue(FieldSpec field) {
  if (field.options.isNotEmpty) return field.options.first;
  return switch (field.key) {
    'nik' => '1607000000000001',
    'ttl_tempat' => 'Calang',
    'ttl_tanggal' => '1999-10-22',
    'agama' => 'Islam',
    'gampong' || 'alamat_desa' => 'Blang',
    'kecamatan' || 'alamat_kecamatan' => 'Krueng Sabee',
    'kabupaten' || 'alamat_kabupaten' => 'Aceh Jaya',
    'kewarganegaraan' => 'Indonesia',
    'tahun_mulai' => '2020',
    'pukul' => '09:30',
    'anak_total' || 'anak_laki' || 'anak_perempuan' => '0',
    'barang_hilang' => 'Kartu Tanda Penduduk',
    'alamat' => 'Dusun Kuini, Gampong Blang',
    _ => field.label.contains('Nama') ? 'Roni Asra' : 'Data contoh',
  };
}
