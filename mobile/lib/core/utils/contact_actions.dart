import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme/app_theme.dart';

const fallbackOfficePhone = '+62 813-6000-0000';

String resolveOfficePhone(String? phone) {
  final value = phone?.trim();
  return value == null || value.isEmpty ? fallbackOfficePhone : value;
}

Future<void> openExternalWebsite(
  BuildContext context,
  String url, {
  String errorMessage = 'Tautan belum bisa dibuka di perangkat ini.',
}) async {
  try {
    final uri = Uri.parse(url);
    if (await launchUrl(uri, mode: LaunchMode.externalApplication)) return;
  } catch (_) {
    // Use one clear message for invalid URLs and launcher failures.
  }
  if (!context.mounted) return;
  ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(errorMessage)));
}

Future<void> showOfficeContactActions(BuildContext context, String phone) {
  final normalized = _normalizeIndonesianPhone(phone);
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: AppTheme.g50,
    showDragHandle: true,
    builder: (sheetContext) {
      return SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Hubungi Kantor Keuchik',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 4),
              Text(
                phone,
                style: const TextStyle(
                  color: AppTheme.ink500,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 14),
              ListTile(
                leading: const Icon(Icons.chat_outlined, color: AppTheme.g700),
                title: const Text('WhatsApp'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  unawaited(_openWhatsApp(context, normalized));
                },
              ),
              ListTile(
                leading: const Icon(Icons.call_outlined, color: AppTheme.g700),
                title: const Text('Telepon'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  unawaited(_openPhoneCall(context, normalized));
                },
              ),
            ],
          ),
        ),
      );
    },
  );
}

Future<void> _openWhatsApp(BuildContext context, String phone) async {
  final whatsappUri = Uri.parse('whatsapp://send?phone=$phone');
  final webUri = Uri.parse('https://wa.me/$phone');

  try {
    if (await launchUrl(whatsappUri, mode: LaunchMode.externalApplication)) {
      return;
    }
    if (await launchUrl(webUri, mode: LaunchMode.externalApplication)) return;
  } catch (_) {
    // Use the same message for unsupported devices and launcher failures.
  }
  if (!context.mounted) return;
  _showContactError(context);
}

Future<void> _openPhoneCall(BuildContext context, String phone) async {
  final uri = Uri(scheme: 'tel', path: '+$phone');
  try {
    if (await launchUrl(uri, mode: LaunchMode.externalApplication)) return;
  } catch (_) {
    // Use the same message for unsupported devices and launcher failures.
  }
  if (!context.mounted) return;
  _showContactError(context);
}

void _showContactError(BuildContext context) {
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Kontak belum bisa dibuka di perangkat ini.')),
  );
}

String _normalizeIndonesianPhone(String value) {
  final digits = value.replaceAll(RegExp(r'\D'), '');
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return '62${digits.substring(1)}';
  return digits;
}
