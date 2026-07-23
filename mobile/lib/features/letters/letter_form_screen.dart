import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/validators.dart';
import '../../core/widgets/resident_email_gate.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/attachment.dart';
import '../../data/models/field_spec.dart';
import '../../data/models/letter_type.dart';
import '../../data/providers/resident_providers.dart';

class LetterFlowDraft {
  const LetterFlowDraft({
    required this.letterType,
    required this.applicantName,
    required this.applicantEmail,
    required this.applicantPhone,
    required this.subjectData,
    this.attachments = const [],
    this.falseStatementConfirmed = false,
    this.keperluan,
    this.referenceCode,
  });

  final LetterType letterType;
  final String applicantName;
  final String applicantEmail;
  final String applicantPhone;
  final Map<String, String> subjectData;
  final List<Attachment> attachments;
  final bool falseStatementConfirmed;
  final String? keperluan;
  final String? referenceCode;

  LetterFlowDraft copyWith({
    List<Attachment>? attachments,
    bool? falseStatementConfirmed,
    String? keperluan,
    String? referenceCode,
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
      keperluan: keperluan ?? this.keperluan,
      referenceCode: referenceCode ?? this.referenceCode,
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

class LetterFormScreen extends ConsumerStatefulWidget {
  const LetterFormScreen({super.key, required this.letterType});

  final LetterType letterType;

  @override
  ConsumerState<LetterFormScreen> createState() => _LetterFormScreenState();
}

class _LetterFormScreenState extends ConsumerState<LetterFormScreen> {
  final formKey = GlobalKey<FormState>();
  final applicantName = TextEditingController();
  final applicantPhone = TextEditingController();
  final values = <String, TextEditingController>{};
  final enumValues = <String, String>{};

  @override
  void initState() {
    super.initState();
    for (final field in widget.letterType.fields) {
      if (field.type == FieldType.enumT) {
        enumValues[field.key] = _defaultValue(field);
      } else {
        values[field.key] = TextEditingController(text: _defaultValue(field));
      }
    }
  }

  Future<void> _pickDate(String key) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(1900),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      final y = picked.year.toString().padLeft(4, '0');
      final m = picked.month.toString().padLeft(2, '0');
      final d = picked.day.toString().padLeft(2, '0');
      values[key]?.text = '$y-$m-$d';
    }
  }

  Future<void> _pickTime(String key) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (picked != null) {
      final h = picked.hour.toString().padLeft(2, '0');
      final min = picked.minute.toString().padLeft(2, '0');
      values[key]?.text = '$h:$min';
    }
  }

  @override
  void dispose() {
    applicantName.dispose();
    applicantPhone.dispose();
    for (final controller in values.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(residentSessionProvider).asData?.value;
    final visibleFields = widget.letterType.fields
        .where((field) => !_isApplicantDerivedField(field))
        .toList();

    return SapaScaffold(
      title: widget.letterType.name,
      subtitle: 'Langkah 2 dari 5',
      leading: const SapaBackButton(),
      padding: EdgeInsets.zero,
      body: ResidentEmailGate(
        message:
            'Verifikasi email terlebih dahulu agar permohonan surat tersimpan di riwayat Anda.',
        child: Form(
          key: formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              StepHeader(step: 2, code: widget.letterType.code),
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
              InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Alamat Email',
                  helperText: 'Surat jadi hanya dikirim ke email ini.',
                ),
                child: Text(
                  session?.email ?? '-',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: applicantPhone,
                decoration: const InputDecoration(labelText: 'No. HP'),
                keyboardType: TextInputType.phone,
                validator: Validators.phone,
                textInputAction: TextInputAction.next,
              ),
              if (visibleFields.isNotEmpty) ...[
                const SectionTitle('Data Surat'),
                for (final field in visibleFields) ...[
                  _FieldInput(
                    field: field,
                    controller: values[field.key],
                    value: enumValues[field.key],
                    onChanged: (value) => setState(() {
                      if (value != null) enumValues[field.key] = value;
                    }),
                    onPickDate: field.type == FieldType.date
                        ? () => _pickDate(field.key)
                        : null,
                    onPickTime: field.type == FieldType.time
                        ? () => _pickTime(field.key)
                        : null,
                  ),
                  const SizedBox(height: 12),
                ],
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
      ),
    );
  }

  void _continue() {
    if (!(formKey.currentState?.validate() ?? false)) {
      return;
    }

    final session = ref.read(residentSessionProvider).asData?.value;
    if (session == null) return;

    final subjectData = <String, String>{};
    for (final field in widget.letterType.fields) {
      subjectData[field.key] = _isApplicantDerivedField(field)
          ? _applicantDerivedValue(field, session.email)
          : field.type == FieldType.enumT
          ? enumValues[field.key] ?? ''
          : values[field.key]?.text ?? '';
    }

    context.pushNamed(
      AppRouteNames.purpose,
      extra: LetterFlowDraft(
        letterType: widget.letterType,
        applicantName: applicantName.text.trim(),
        applicantEmail: session.email,
        applicantPhone: applicantPhone.text.trim(),
        subjectData: subjectData,
      ),
    );
  }

  bool _isApplicantDerivedField(FieldSpec field) {
    if (!widget.letterType.subjectIsApplicant) return false;
    return switch (field.key) {
      'nama' || 'nama_anak' || 'nama_pemohon' => true,
      'email' || 'applicant_email' => true,
      'no_hp' || 'nomor_hp' || 'telepon' || 'phone' => true,
      _ => false,
    };
  }

  String _applicantDerivedValue(FieldSpec field, String applicantEmail) {
    return switch (field.key) {
      'nama' || 'nama_pemohon' => applicantName.text.trim(),
      'email' || 'applicant_email' => applicantEmail,
      'no_hp' ||
      'nomor_hp' ||
      'telepon' ||
      'phone' => applicantPhone.text.trim(),
      _ => '',
    };
  }
}

class StepHeader extends StatelessWidget {
  const StepHeader({super.key, required this.step, required this.code});

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
        StepLabels(step: step),
        const SizedBox(height: 4),
      ],
    );
  }
}

class StepLabels extends StatelessWidget {
  const StepLabels({super.key, required this.step});

  final int step;

  static const _labels = ['Jenis', 'Data', 'Tujuan', 'Lampiran', 'Kirim'];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(_labels.length, (i) {
        final active = i + 1 == step;
        return Expanded(
          child: Center(
            child: Text(
              _labels[i],
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 10,
                fontWeight: active ? FontWeight.w800 : FontWeight.w500,
                color: active ? AppTheme.villageGreen : const Color(0xFFB7BEB9),
              ),
            ),
          ),
        );
      }),
    );
  }
}

class _FieldInput extends StatelessWidget {
  const _FieldInput({
    required this.field,
    required this.controller,
    required this.value,
    required this.onChanged,
    this.onPickDate,
    this.onPickTime,
  });

  final FieldSpec field;
  final TextEditingController? controller;
  final String? value;
  final ValueChanged<String?> onChanged;
  final VoidCallback? onPickDate;
  final VoidCallback? onPickTime;

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

    if (field.type == FieldType.date) {
      return TextFormField(
        key: Key('field-${field.key}'),
        controller: controller,
        readOnly: true,
        onTap: onPickDate,
        decoration: InputDecoration(
          labelText: _label,
          suffixIcon: const Icon(Icons.calendar_today_outlined),
        ),
        validator: Validators.forField(field),
      );
    }

    if (field.type == FieldType.time) {
      return TextFormField(
        key: Key('field-${field.key}'),
        controller: controller,
        readOnly: true,
        onTap: onPickTime,
        decoration: InputDecoration(
          labelText: _label,
          suffixIcon: const Icon(Icons.access_time_outlined),
        ),
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

// Returns smart defaults for known geography/religion fields; empty for everything else.
String _defaultValue(FieldSpec field) {
  if (field.options.isNotEmpty) return field.options.first;
  return switch (field.key) {
    'agama' => 'Islam',
    'kewarganegaraan' => 'Indonesia',
    'gampong' || 'alamat_desa' => 'Blang',
    'kecamatan' || 'alamat_kecamatan' => 'Krueng Sabee',
    'kabupaten' || 'alamat_kabupaten' => 'Aceh Jaya',
    _ => '',
  };
}

// Used by LetterFlowDraft.sample() for dev/test fallback data.
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
