import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers/resident_providers.dart';
import '../../data/providers/content_providers.dart';
import '../../data/models/resident_session.dart';
import '../network/api_exception.dart';
import '../theme/app_theme.dart';
import '../utils/validators.dart';
import 'sapa_fields.dart';

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
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppTheme.gold500),
      ),
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
        leading: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: AppTheme.gold500,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            verified ? Icons.mark_email_read_outlined : Icons.mark_email_unread,
            color: AppTheme.ink900,
          ),
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
        trailing: const Icon(Icons.edit_outlined, color: AppTheme.ink700),
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
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppTheme.gold500,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.mark_email_unread_outlined,
                    color: AppTheme.ink900,
                  ),
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
  bool _verifyingOtp = false;
  String? _challengeEmail;
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
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 26, vertical: 24),
      backgroundColor: AppTheme.g50,
      surfaceTintColor: AppTheme.g50,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 24, 22, 22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _otpSent ? 'Masukkan OTP' : 'Email warga',
                style: const TextStyle(
                  color: AppTheme.inputText,
                  fontSize: 25,
                  fontWeight: FontWeight.w800,
                  height: 1.15,
                ),
              ),
              const SizedBox(height: 20),
              if (!_otpSent) _emailForm() else _otpForm(),
              if (_error != null) ...[
                const SizedBox(height: 12),
                _DialogMessage(message: _error!, isError: true),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _loading
                      ? null
                      : (_otpSent ? _verifyOtp : _requestOtp),
                  child: Text(
                    _loading
                        ? 'Memproses...'
                        : _otpSent
                        ? 'Verifikasi'
                        : 'Kirim OTP',
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.center,
                child: TextButton(
                  onPressed: _loading ? null : () => Navigator.pop(context),
                  style: TextButton.styleFrom(
                    foregroundColor: AppTheme.g800,
                    disabledForegroundColor: AppTheme.ink300,
                  ),
                  child: const Text('Batal'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _emailForm() {
    return Form(
      key: _emailKey,
      child: SapaTextField(
        controller: _email,
        label: 'Alamat email',
        helperText: 'Kode OTP akan dikirim ke email ini.',
        labelColor: AppTheme.ink700,
        helperColor: AppTheme.ink500,
        keyboardType: TextInputType.emailAddress,
        validator: Validators.email,
      ),
    );
  }

  Widget _otpForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Form(
          key: _otpKey,
          child: SapaTextField(
            controller: _otp,
            label: 'Kode OTP',
            labelColor: AppTheme.ink700,
            keyboardType: TextInputType.number,
            maxLength: 6,
            counterText: '',
            validator: Validators.required,
          ),
        ),
        if (_challengeEmail != null) ...[
          const SizedBox(height: 12),
          _DialogMessage(
            message: 'Kode dikirim ke $_challengeEmail',
            icon: Icons.mail_outline,
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _loading ? null : _requestOtp,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Kirim ulang OTP'),
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _requestOtp() async {
    if (!_otpSent && !(_emailKey.currentState?.validate() ?? false)) return;
    final email = (_otpSent ? _challengeEmail : _email.text)?.trim() ?? '';
    if (email.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
      if (!_otpSent) _challengeEmail = null;
    });
    try {
      await ref.read(residentRepositoryProvider).requestOtp(email);
      if (!mounted) return;
      setState(() {
        _otpSent = true;
        _challengeEmail = email;
        _otp.clear();
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error =
            _apiErrorMessage(error) ??
            'Kode OTP belum bisa dikirim. Coba lagi.';
        _loading = false;
      });
    }
  }

  Future<void> _verifyOtp() async {
    if (_verifyingOtp) return;
    if (!(_otpKey.currentState?.validate() ?? false)) return;
    final email = _challengeEmail ?? _email.text.trim();
    setState(() {
      _loading = true;
      _error = null;
    });
    _verifyingOtp = true;

    ResidentSession session;
    try {
      session = await ref
          .read(residentRepositoryProvider)
          .verifyOtp(email: email, otp: _otp.text.trim());
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error =
            _apiErrorMessage(error) ?? 'Kode OTP salah atau sudah kedaluwarsa.';
        _loading = false;
      });
      _verifyingOtp = false;
      return;
    }

    try {
      await ref.read(residentSessionProvider.notifier).save(session);
      await ref.read(notificationServiceProvider).linkResidentDevice(session);
    } catch (error) {
      debugPrint(
        'Failed to activate resident session after OTP verify: $error',
      );
    } finally {
      _verifyingOtp = false;
    }

    if (!mounted) return;
    Navigator.pop(context);
  }

  String? _apiErrorMessage(Object error) {
    if (error is ApiException) return error.message;
    if (error is DioException && error.error is ApiException) {
      return (error.error! as ApiException).message;
    }
    return null;
  }
}

class _DialogMessage extends StatelessWidget {
  const _DialogMessage({
    required this.message,
    this.icon = Icons.info_outline,
    this.isError = false,
  });

  final String message;
  final IconData icon;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final foreground = isError ? AppTheme.errorText : AppTheme.ink700;
    final background = isError ? AppTheme.dangerBg : AppTheme.fieldSurface;
    final border = isError ? AppTheme.errorText : AppTheme.line;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: background,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: foreground, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: foreground,
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
