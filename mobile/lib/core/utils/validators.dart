import '../../data/models/field_spec.dart';

typedef FieldValidator = String? Function(String? value);

class Validators {
  const Validators._();

  static String? required(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Wajib diisi';
    }
    return null;
  }

  static String? nik(String? value) {
    final requiredError = required(value);
    if (requiredError != null) {
      return requiredError;
    }

    if (!RegExp(r'^\d{16}$').hasMatch(value!.trim())) {
      return 'NIK harus 16 digit';
    }

    return null;
  }

  static String? email(String? value) {
    final requiredError = required(value);
    if (requiredError != null) {
      return requiredError;
    }

    final normalized = value!.trim();
    final isValid = RegExp(
      r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$',
    ).hasMatch(normalized);

    if (!isValid) {
      return 'Alamat email tidak valid';
    }

    return null;
  }

  static String? phone(String? value) {
    final requiredError = required(value);
    if (requiredError != null) {
      return requiredError;
    }

    if (!RegExp(r'^0\d{8,13}$').hasMatch(value!.trim())) {
      return 'No. HP tidak valid';
    }

    return null;
  }

  static FieldValidator forField(FieldSpec field) {
    return (value) {
      if (!field.required && (value == null || value.trim().isEmpty)) {
        return null;
      }

      return switch (field.type) {
        FieldType.nik => nik(value),
        FieldType.email => email(value),
        FieldType.phone => phone(value),
        FieldType.enumT => _enum(field, value),
        _ => field.required ? required(value) : null,
      };
    };
  }

  static String? _enum(FieldSpec field, String? value) {
    final normalized = value?.trim();
    if (normalized == null || normalized.isEmpty) {
      return field.required ? 'Wajib dipilih' : null;
    }

    if (field.options.isNotEmpty && !field.options.contains(normalized)) {
      return 'Pilihan tidak valid';
    }

    return null;
  }
}
