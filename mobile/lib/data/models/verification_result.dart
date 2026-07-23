class VerificationResult {
  const VerificationResult.invalid() : details = null;

  const VerificationResult.valid(this.details);

  final VerifiedLetterDetails? details;

  bool get valid => details != null;

  factory VerificationResult.fromJson(Map<String, Object?> json) {
    final isValid = json['valid'] == true;
    if (!isValid) return const VerificationResult.invalid();

    return VerificationResult.valid(
      VerifiedLetterDetails(
        nomorSurat: json['nomor_surat'] as String? ?? '-',
        jenisSurat: json['jenis_surat'] as String? ?? '-',
        tanggalTerbit: json['tanggal_terbit'] as String? ?? '-',
        penandatangan: json['penandatangan'] as String? ?? '-',
        perihal: json['perihal'] as String? ?? '-',
      ),
    );
  }
}

class VerifiedLetterDetails {
  const VerifiedLetterDetails({
    required this.nomorSurat,
    required this.jenisSurat,
    required this.tanggalTerbit,
    required this.penandatangan,
    required this.perihal,
  });

  final String nomorSurat;
  final String jenisSurat;
  final String tanggalTerbit;
  final String penandatangan;
  final String perihal;
}
