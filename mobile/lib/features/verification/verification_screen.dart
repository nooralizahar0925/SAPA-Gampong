import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/sapa_scaffold.dart';
import '../../data/models/verification_result.dart';
import '../../data/providers/verification_providers.dart';
import '../../data/repositories/verification_repository.dart';

class VerificationScreen extends ConsumerStatefulWidget {
  const VerificationScreen({super.key, this.initialToken});

  final String? initialToken;

  @override
  ConsumerState<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends ConsumerState<VerificationScreen> {
  late final TextEditingController _controller;
  bool _loading = false;
  VerificationResult? _result;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialToken ?? '');
    if ((widget.initialToken ?? '').trim().isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _verify());
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Verifikasi Keaslian Surat',
      subtitle: 'Masukkan tautan QR atau token',
      leading: const SapaBackButton(),
      body: ListView(
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Cek surat resmi',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Pindai QR pada surat, tempel tautan, atau masukkan token verifikasi untuk memastikan dokumen tercatat di arsip gampong.',
                    style: TextStyle(color: AppTheme.ink500, height: 1.45),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      key: const Key('verification-scan'),
                      onPressed: _loading ? null : _openScanner,
                      icon: const Icon(Icons.qr_code_scanner_outlined),
                      label: const Text('Pindai QR'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    key: const Key('verification-input'),
                    controller: _controller,
                    decoration: InputDecoration(
                      labelText: 'Tautan atau token verifikasi',
                      hintText: 'https://.../verify/abcdef',
                      suffixIcon: IconButton(
                        key: const Key('verification-clear'),
                        onPressed: _loading
                            ? null
                            : () {
                                _controller.clear();
                                setState(() {
                                  _result = null;
                                  _error = null;
                                });
                              },
                        icon: const Icon(Icons.close),
                      ),
                    ),
                    textInputAction: TextInputAction.search,
                    onSubmitted: (_) => _verify(),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      key: const Key('verification-submit'),
                      onPressed: _loading ? null : _verify,
                      icon: _loading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.verified_outlined),
                      label: Text(
                        _loading ? 'Memeriksa...' : 'Verifikasi Surat',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (_error != null && !_loading) _MessageCard.invalid(_error!),
          if (_result != null && !_loading)
            _VerificationResultCard(result: _result!),
        ],
      ),
    );
  }

  Future<void> _verify() async {
    final token = extractVerificationToken(_controller.text);
    if (token.isEmpty) {
      setState(() {
        _result = null;
        _error = 'Masukkan tautan QR atau token verifikasi terlebih dahulu.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _result = null;
      _error = null;
    });

    try {
      final result = await ref
          .read(verificationRepositoryProvider)
          .verify(token);
      if (!mounted) return;
      setState(() {
        _result = result;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error =
            'Verifikasi belum bisa dilakukan. Periksa koneksi lalu coba lagi.';
        _loading = false;
      });
    }
  }

  Future<void> _openScanner() async {
    final scanned = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _QrScannerSheet(),
    );
    if (!mounted || scanned == null || scanned.trim().isEmpty) return;

    _controller.text = scanned.trim();
    await _verify();
  }
}

class _QrScannerSheet extends StatefulWidget {
  const _QrScannerSheet();

  @override
  State<_QrScannerSheet> createState() => _QrScannerSheetState();
}

class _QrScannerSheetState extends State<_QrScannerSheet> {
  late final MobileScannerController _scanner;
  bool _handled = false;

  @override
  void initState() {
    super.initState();
    _scanner = MobileScannerController(
      formats: const [BarcodeFormat.qrCode],
      detectionSpeed: DetectionSpeed.normal,
      detectionTimeoutMs: 500,
    );
  }

  @override
  void dispose() {
    unawaited(_scanner.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      heightFactor: 0.86,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 8, 10),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Pindai QR Surat',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                ),
                IconButton(
                  tooltip: 'Tutup',
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  MobileScanner(
                    controller: _scanner,
                    onDetect: _onDetect,
                    errorBuilder: (context, error) => Container(
                      color: AppTheme.ink900,
                      padding: const EdgeInsets.all(24),
                      alignment: Alignment.center,
                      child: const Text(
                        'Kamera belum bisa dibuka. Pastikan izin kamera diberikan, atau gunakan input manual.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          height: 1.45,
                        ),
                      ),
                    ),
                    placeholderBuilder: (_) => const ColoredBox(
                      color: AppTheme.ink900,
                      child: Center(
                        child: CircularProgressIndicator(color: Colors.white),
                      ),
                    ),
                  ),
                  const _ScannerFrame(),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                const Text(
                  'Arahkan kamera ke QR pada surat resmi. Hasil pindai akan langsung diverifikasi.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppTheme.ink500, height: 1.45),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Input manual'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    final raw = capture.barcodes
        .map((barcode) => barcode.rawValue)
        .whereType<String>()
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .firstOrNull;
    if (raw == null) return;

    _handled = true;
    Navigator.pop(context, raw);
  }
}

class _ScannerFrame extends StatelessWidget {
  const _ScannerFrame();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Center(
        child: Container(
          width: 240,
          height: 240,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.white, width: 2),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Container(
            margin: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              border: Border.all(color: AppTheme.gold500, width: 3),
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ),
    );
  }
}

class _VerificationResultCard extends StatelessWidget {
  const _VerificationResultCard({required this.result});

  final VerificationResult result;

  @override
  Widget build(BuildContext context) {
    final details = result.details;
    if (details == null) {
      return const _InvalidResultCard();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _MessageCard.valid(
          'Surat terverifikasi. Dokumen ini tercatat resmi dan diterbitkan secara sah oleh Pemerintah Gampong Blang.',
        ),
        const SizedBox(height: 14),
        const SectionTitle('Detail Surat'),
        _VerifyRow('Nomor Surat', details.nomorSurat),
        _VerifyRow('Jenis Surat', details.jenisSurat),
        _VerifyRow('Tanggal Terbit', _formatIssuedDate(details.tanggalTerbit)),
        _VerifyRow('Penandatangan', details.penandatangan),
        _VerifyRow('Perihal', details.perihal),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.g50,
            border: Border.all(color: AppTheme.g300),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Text(
            'Nama dan NIK sengaja disamarkan. Halaman ini hanya membuktikan keaslian surat, tanpa menampilkan data pribadi pemiliknya.',
            style: TextStyle(
              color: AppTheme.g700,
              fontWeight: FontWeight.w600,
              height: 1.45,
            ),
          ),
        ),
      ],
    );
  }
}

class _InvalidResultCard extends StatelessWidget {
  const _InvalidResultCard();

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _MessageCard.invalid(
          'Surat tidak terverifikasi. Kode QR tidak dikenali dalam arsip gampong, atau surat tersebut sudah dicabut.',
        ),
        SizedBox(height: 14),
        Card(
          child: Padding(
            padding: EdgeInsets.all(14),
            child: Text(
              'Pastikan tautan QR terpindai dengan jelas. Jangan menerima dokumen sebagai surat resmi sebelum dikonfirmasi ke Kantor Keuchik Gampong Blang.',
              style: TextStyle(
                color: AppTheme.ink500,
                fontWeight: FontWeight.w600,
                height: 1.45,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _MessageCard extends StatelessWidget {
  const _MessageCard.valid(this.message)
    : color = AppTheme.okBg,
      iconColor = AppTheme.ok,
      icon = Icons.verified,
      keyValue = 'verification-valid';

  const _MessageCard.invalid(this.message)
    : color = AppTheme.warnBg,
      iconColor = AppTheme.warn,
      icon = Icons.error_outline,
      keyValue = 'verification-invalid';

  final String message;
  final Color color;
  final Color iconColor;
  final IconData icon;
  final String keyValue;

  @override
  Widget build(BuildContext context) {
    return Card(
      key: Key(keyValue),
      color: color,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: iconColor, size: 34),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VerifyRow extends StatelessWidget {
  const _VerifyRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                label,
                style: const TextStyle(color: AppTheme.ink500),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                value,
                textAlign: TextAlign.right,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _formatIssuedDate(String isoDate) {
  final parsed = DateTime.tryParse('${isoDate}T00:00:00Z');
  if (parsed == null) return isoDate;

  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return '${parsed.day} ${months[parsed.month - 1]} ${parsed.year}';
}
