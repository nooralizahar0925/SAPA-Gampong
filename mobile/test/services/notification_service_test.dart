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

    test('ignores unrelated data messages', () {
      final notification = NotificationService.residentNotificationFromData({
        'event': 'SUBMITTED',
      });

      expect(notification, isNull);
    });
  });
}
