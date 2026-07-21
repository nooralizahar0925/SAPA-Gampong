import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/validators.dart';
import '../../core/widgets/sapa_scaffold.dart';

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key});

  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  final formKey = GlobalKey<FormState>();
  final name = TextEditingController(text: 'Roni Asra');
  final email = TextEditingController(text: 'asra.roniasra@gmail.com');
  final phone = TextEditingController(text: '081234567890');
  final body = TextEditingController();
  bool sent = false;

  @override
  void dispose() {
    name.dispose();
    email.dispose();
    phone.dispose();
    body.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SapaScaffold(
      title: 'Pelaporan Warga',
      subtitle: 'Sampaikan ke kantor keuchik',
      leading: const SapaBackButton(),
      body: sent ? _success(context) : _form(),
    );
  }

  Widget _form() {
    return Form(
      key: formKey,
      child: ListView(
        children: [
          TextFormField(
            controller: name,
            decoration: const InputDecoration(labelText: 'Nama Lengkap'),
            validator: Validators.required,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: email,
            decoration: const InputDecoration(labelText: 'Alamat Email'),
            validator: Validators.email,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: phone,
            decoration: const InputDecoration(labelText: 'No. HP'),
            validator: Validators.phone,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: body,
            decoration: const InputDecoration(labelText: 'Isi Laporan'),
            validator: Validators.required,
            maxLines: 5,
          ),
          const SizedBox(height: 12),
          const Card(
            child: ListTile(
              leading: Icon(Icons.attach_file),
              title: Text('Lampiran foto/dokumen'),
              subtitle: Text('Opsional · simulasi frontend'),
            ),
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: () {
              if (formKey.currentState?.validate() ?? false) {
                setState(() => sent = true);
              }
            },
            icon: const Icon(Icons.send_outlined),
            label: const Text('Kirim Laporan'),
          ),
        ],
      ),
    );
  }

  Widget _success(BuildContext context) {
    return ListView(
      children: [
        const SizedBox(height: 42),
        Center(
          child: Container(
            width: 92,
            height: 92,
            decoration: BoxDecoration(
              color: AppTheme.okBg,
              borderRadius: BorderRadius.circular(30),
            ),
            child: const Icon(
              Icons.check,
              size: 52,
              color: AppTheme.ok,
            ),
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'Laporan telah dikirim',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 12),
        Text(
          'Laporan Anda akan ditindaklanjuti melalui email ${email.text} dalam waktu maksimal 3×24 jam.',
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppTheme.ink500, height: 1.5),
        ),
        const SizedBox(height: 22),
        // Report reference code card
        Card(
          color: AppTheme.g50,
          child: const Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              children: [
                Text(
                  'Kode Laporan',
                  style: TextStyle(
                    color: AppTheme.ink500,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'LPR-5D8Q3',
                  style: TextStyle(
                    color: AppTheme.villageGreen,
                    fontSize: 28,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 2,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Info alert
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.g50,
            border: Border.all(color: AppTheme.g300),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Row(
            children: [
              Icon(Icons.info_outline, size: 18, color: AppTheme.g700),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Diterima kantor keuchik. Simpan kode laporan untuk referensi.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppTheme.g700,
                    fontWeight: FontWeight.w600,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),
        FilledButton(
          onPressed: () => context.goNamed(AppRouteNames.home),
          child: const Text('Kembali ke Beranda'),
        ),
      ],
    );
  }
}
