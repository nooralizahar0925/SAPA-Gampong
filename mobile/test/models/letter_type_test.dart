import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/data/models/field_spec.dart';
import 'package:sapa_gampong/data/models/letter_type.dart';

void main() {
  test('parses L1 letter type from API contract sample', () {
    final letterType = LetterType.fromJson(const {
      'code': 'L1',
      'name': 'Surat Keterangan Berdomisili',
      'description': 'Keterangan domisili warga.',
      'subject_is_applicant': true,
      'required_attachments': ['KTP', 'KK'],
      'fields': [
        {'key': 'nama', 'label': 'Nama', 'type': 'text', 'required': true},
        {
          'key': 'ttl_tempat',
          'label': 'Tempat Lahir',
          'type': 'text',
          'required': true,
        },
        {
          'key': 'ttl_tanggal',
          'label': 'Tanggal Lahir',
          'type': 'date',
          'required': true,
        },
        {'key': 'nik', 'label': 'NIK', 'type': 'nik', 'required': true},
        {
          'key': 'jenis_kelamin',
          'label': 'Jenis Kelamin',
          'type': 'enum',
          'required': true,
          'options': ['Laki-laki', 'Perempuan'],
        },
      ],
    });

    expect(letterType.code, 'L1');
    expect(letterType.requiredAttachments, ['KTP', 'KK']);
    expect(letterType.fields, hasLength(5));
    expect(letterType.fields[3].type, FieldType.nik);
    expect(letterType.fields[4].type, FieldType.enumT);
  });
}
