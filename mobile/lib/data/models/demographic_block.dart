class DemographicBlock {
  const DemographicBlock({
    required this.key,
    required this.label,
    required this.type,
    required this.rawData,
    this.order = 0,
    this.visible = true,
  });

  final String key;
  final String label;
  final String type;

  // Can be a List<{label, value}> (new ordered format) or a Map<String, Object?> (legacy).
  final Object? rawData;

  final int order;
  final bool visible;

  // Ordered (displayLabel, value) pairs for split/bar/pie blocks.
  List<(String, int)> get entries {
    final raw = rawData;
    if (raw is List) {
      // New ordered-array format: [{label: "SD", value: 412}, ...]
      return raw
          .whereType<Map>()
          .map((e) => (
                e['label'] as String? ?? '',
                (e['value'] as num?)?.toInt() ?? 0,
              ))
          .where((pair) => pair.$1.isNotEmpty)
          .toList();
    }
    if (raw is Map) {
      // Legacy key-value map: {laki_laki: 777, perempuan: 740, ...}
      return raw.entries
          .where((e) => e.value is num && e.key != 'value')
          .map((e) => (_humanizeKey(e.key as String), (e.value as num).toInt()))
          .toList();
    }
    return [];
  }

  // The single value for 'number' type blocks ({value: N} map).
  int? get numberValue {
    final raw = rawData;
    if (raw is Map) return (raw['value'] as num?)?.toInt();
    return null;
  }

  factory DemographicBlock.fromJson(Map<String, Object?> json) {
    return DemographicBlock(
      key: json['key'] as String? ?? '',
      label: json['label'] as String? ?? '',
      type: json['type'] as String? ?? 'number',
      rawData: json['data'],
      order: (json['order'] as num?)?.toInt() ?? 0,
      visible: json['visible'] as bool? ?? true,
    );
  }
}

const _keyLabels = <String, String>{
  'laki_laki': 'Laki-laki',
  'perempuan': 'Perempuan',
  'sd': 'SD',
  'smp': 'SMP',
  'sma': 'SMA',
  'diploma': 'Diploma',
  'sarjana': 'Sarjana/S-1',
  'petani': 'Petani',
  'nelayan': 'Nelayan',
  'pedagang': 'Pedagang',
  'pns': 'PNS/TNI/Polri',
  'wiraswasta': 'Wiraswasta',
  'lainnya': 'Lainnya',
};

String _humanizeKey(String key) =>
    _keyLabels[key] ??
    key
        .split('_')
        .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
