import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/core/utils/validators.dart';
import 'package:sapa_gampong/data/models/field_spec.dart';

void main() {
  group('Validators', () {
    test('validates NIK as 16 numeric digits', () {
      expect(Validators.nik('1607'), 'NIK harus 16 digit');
      expect(Validators.nik('1607000000000001'), isNull);
    });

    test('validates email format', () {
      expect(Validators.email('budi'), 'Alamat email tidak valid');
      expect(Validators.email('budi@mail.com'), isNull);
    });

    test('requires enum fields to be selected', () {
      const field = FieldSpec(
        key: 'jenis_kelamin',
        label: 'Jenis Kelamin',
        type: FieldType.enumT,
        required: true,
        options: ['Laki-laki', 'Perempuan'],
      );

      expect(Validators.forField(field)(''), 'Wajib dipilih');
      expect(Validators.forField(field)('Laki-laki'), isNull);
    });

    test('validates phone numbers starting with zero', () {
      expect(Validators.phone('812345'), 'No. HP tidak valid');
      expect(Validators.phone('081234567890'), isNull);
    });
  });
}
