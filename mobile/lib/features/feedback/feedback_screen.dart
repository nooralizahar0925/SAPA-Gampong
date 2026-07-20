import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
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
      leading: const BackButton(),
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
    return Center(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.check_circle,
                size: 64,
                color: Color(0xFF1E8A61),
              ),
              const SizedBox(height: 16),
              const Text(
                'Laporan telah dikirim',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 10),
              Text(
                'Laporan Anda sedang diproses dan akan ditindaklanjuti melalui email ${email.text} dalam waktu maksimal 3×24 jam.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: () => context.goNamed(AppRouteNames.home),
                child: const Text('Kembali ke Beranda'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
