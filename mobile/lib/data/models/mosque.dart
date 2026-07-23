class Mosque {
  const Mosque({
    required this.id,
    required this.name,
    required this.address,
    this.landmark,
    this.photoFileId,
    this.photoUrl,
  });

  final String id;
  final String name;
  final String address;
  final String? landmark;
  final String? photoFileId;
  final String? photoUrl;

  factory Mosque.fromJson(Map<String, Object?> json) {
    return Mosque(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      address: json['address'] as String? ?? '',
      landmark: json['landmark'] as String?,
      photoFileId: json['photo_file_id'] as String?,
      photoUrl: json['photo_url'] as String?,
    );
  }
}
