import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/data/services/notification_service.dart';

void main() {
  group('resident push notifications', () {
    test('maps SENT data message to resident notification copy', () {
      final notification = NotificationService.residentNotificationFromData({
        'event': 'SENT',
        'reference_code': 'GB-2026-000123',
      });

      expect(notification, isNotNull);
      expect(notification!.title, 'Surat Anda sudah dikirim');
      expect(notification.body, contains('GB-2026-000123'));
    });

    test('maps REJECTED data message to resident notification copy', () {
      final notification = NotificationService.residentNotificationFromData({
        'event': 'REJECTED',
        'reference_code': 'GB-2026-000124',
      });

      expect(notification, isNotNull);
      expect(notification!.title, 'Permohonan surat ditolak');
      expect(notification.body, contains('GB-2026-000124'));
    });

    test('maps every request process data message', () {
      const expectedTitles = {
        'SUBMITTED': 'Permohonan surat diterima',
        'IN_REVIEW': 'Permohonan sedang ditinjau',
        'NEEDS_INFO': 'Permohonan perlu dilengkapi',
        'APPROVED': 'Permohonan surat disetujui',
        'GENERATED': 'Surat selesai dibuat',
        'CANCELED': 'Permohonan dibatalkan',
      };

      for (final entry in expectedTitles.entries) {
        final notification = NotificationService.residentNotificationFromData({
          'event': entry.key,
          'reference_code': 'GB-2026-000125',
        });

        expect(notification, isNotNull, reason: entry.key);
        expect(notification!.title, entry.value);
        expect(notification.body, contains('GB-2026-000125'));
      }
    });

    test('maps feedback data messages', () {
      const expectedTitles = {
        'FEEDBACK_NEW': 'Laporan diterima',
        'FEEDBACK_READ': 'Laporan sedang ditinjau',
        'FEEDBACK_RESPONDED': 'Laporan Anda dibalas',
      };

      for (final entry in expectedTitles.entries) {
        final notification = NotificationService.residentNotificationFromData({
          'event': entry.key,
          'reference_code': 'LPR-79459',
        });

        expect(notification, isNotNull, reason: entry.key);
        expect(notification!.title, entry.value);
        expect(notification.body, contains('LPR-79459'));
      }
    });

    test('uses server-provided notification copy', () {
      final notification = NotificationService.residentNotificationFromData({
        'event': 'APPROVED',
        'reference_code': 'GB-2026-000126',
        'title': 'Surat disetujui petugas',
        'body': 'Silakan pantau proses berikutnya.',
      });

      expect(notification, isNotNull);
      expect(notification!.title, 'Surat disetujui petugas');
      expect(notification.body, 'Silakan pantau proses berikutnya.');
    });

    test('keeps process notifications separate for the same request', () {
      final reviewed = NotificationService.residentNotificationFromData({
        'event': 'IN_REVIEW',
        'reference_code': 'GB-2026-000127',
      });
      final approved = NotificationService.residentNotificationFromData({
        'event': 'APPROVED',
        'reference_code': 'GB-2026-000127',
      });
      final sent = NotificationService.residentNotificationFromData({
        'event': 'SENT',
        'reference_code': 'GB-2026-000127',
      });

      expect({reviewed!.id, approved!.id, sent!.id}, hasLength(3));
    });

    test('ignores unrelated data messages', () {
      final notification = NotificationService.residentNotificationFromData({
        'event': 'UNKNOWN',
      });

      expect(notification, isNull);
    });
  });
}
