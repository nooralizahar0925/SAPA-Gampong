import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers/resident_providers.dart';
import '../theme/app_theme.dart';
import '../utils/validators.dart';

class ResidentEmailGate extends ConsumerWidget {
  const ResidentEmailGate({
    super.key,
    required this.child,
    this.message =
        'Simpan dan verifikasi email terlebih dahulu untuk menggunakan layanan ini.',
  });

  final Widget child;
  final String message;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionAsync = ref.watch(residentSessionProvider);
    return sessionAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, _) => _VerifyEmailPanel(message: message),
      data: (session) =>
          session == null ? _VerifyEmailPanel(message: message) : child,
    );
  }
}

class ResidentEmailSummary extends ConsumerWidget {
  const ResidentEmailSummary({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(residentSessionProvider).asData?.value;
    return SapaEmailTile(
      email: session?.email,
      onTap: () => showResidentEmailDialog(context, ref),
    );
  }
}

class SapaEmailTile extends StatelessWidget {
  const SapaEmailTile({super.key, required this.email, required this.onTap});

  final String? email;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final verified = email != null && email!.isNotEmpty;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: Icon(
          verified ? Icons.mark_email_read_outlined : Icons.mark_email_unread,
          color: verified ? AppTheme.ok : AppTheme.warn,
        ),
        title: const Text(
          'Email Tersimpan',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text(
          verified
              ? '$email · Terverifikasi'
              : 'Wajib diverifikasi untuk surat dan pelaporan',
        ),
        trailing: const Icon(Icons.edit_outlined),
        onTap: onTap,
      ),
    );
  }
}

class _VerifyEmailPanel extends ConsumerWidget {
  const _VerifyEmailPanel({required this.message});

  final String message;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView(
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.mark_email_unread_outlined,
                  color: AppTheme.villageGreen,
                  size: 36,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Verifikasi email warga',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                Text(
                  message,
                  style: const TextStyle(color: AppTheme.ink500, height: 1.45),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => showResidentEmailDialog(context, ref),
                    icon: const Icon(Icons.email_outlined),
                    label: const Text('Verifikasi email'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

Future<void> showResidentEmailDialog(BuildContext context, WidgetRef ref) {
  return showDialog<void>(
    context: context,
    builder: (_) => const _ResidentEmailDialog(),
  );
}

class _ResidentEmailDialog extends ConsumerStatefulWidget {
  const _ResidentEmailDialog();

  @override
  ConsumerState<_ResidentEmailDialog> createState() =>
      _ResidentEmailDialogState();
}

class _ResidentEmailDialogState extends ConsumerState<_ResidentEmailDialog> {
  final _emailKey = GlobalKey<FormState>();
  final _otpKey = GlobalKey<FormState>();
  late final TextEditingController _email;
  final _otp = TextEditingController();
  bool _otpSent = false;
  bool _loading = false;
  String? _devOtp;
  String? _error;

  @override
  void initState() {
    super.initState();
    final current = ref.read(residentSessionProvider).asData?.value;
    _email = TextEditingController(text: current?.email ?? '');
  }

  @override
  void dispose() {
    _email.dispose();
    _otp.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(_otpSent ? 'Masukkan OTP' : 'Email warga'),
      content: SizedBox(
        width: 420,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!_otpSent)
              Form(
                key: _emailKey,
                child: TextFormField(
                  controller: _email,
                  decoration: const InputDecoration(
                    labelText: 'Alamat email',
                    helperText: 'Kode OTP akan dikirim ke email ini.',
                  ),
                  keyboardType: TextInputType.emailAddress,
                  validator: Validators.email,
                ),
              )
            else
              Form(
                key: _otpKey,
                child: TextFormField(
                  controller: _otp,
                  decoration: InputDecoration(
                    labelText: 'Kode OTP',
                    helperText: _devOtp == null
                        ? 'Cek kotak masuk email.'
                        : 'Dev OTP: $_devOtp',
                  ),
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  validator: Validators.required,
                ),
              ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(
                _error!,
                style: const TextStyle(
                  color: AppTheme.danger,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _loading ? null : () => Navigator.pop(context),
          child: const Text('Batal'),
        ),
        FilledButton(
          onPressed: _loading ? null : (_otpSent ? _verifyOtp : _requestOtp),
          child: Text(
            _loading
                ? 'Memproses...'
                : _otpSent
                ? 'Verifikasi'
                : 'Kirim OTP',
          ),
        ),
      ],
    );
  }

  Future<void> _requestOtp() async {
    if (!(_emailKey.currentState?.validate() ?? false)) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final challenge = await ref
          .read(residentRepositoryProvider)
          .requestOtp(_email.text.trim());
      if (!mounted) return;
      setState(() {
        _otpSent = true;
        _devOtp = challenge.devOtp;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Kode OTP belum bisa dikirim. Coba lagi.';
        _loading = false;
      });
    }
  }

  Future<void> _verifyOtp() async {
    if (!(_otpKey.currentState?.validate() ?? false)) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final session = await ref
          .read(residentRepositoryProvider)
          .verifyOtp(email: _email.text.trim(), otp: _otp.text.trim());
      await ref.read(residentSessionProvider.notifier).save(session);
      if (!mounted) return;
      Navigator.pop(context);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Kode OTP salah atau sudah kedaluwarsa.';
        _loading = false;
      });
    }
  }
}
