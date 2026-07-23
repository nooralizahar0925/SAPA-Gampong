import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../../core/network/dio_client.dart';
import '../../firebase_options.dart';
import 'content_cache_service.dart';
import 'prayer_times_service.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await NotificationService.showResidentPushData(message.data);
}

class PrayerAlarmSchedule {
  const PrayerAlarmSchedule({
    required this.prayerName,
    required this.scheduledAt,
  });

  final String prayerName;
  final DateTime scheduledAt;
}

class ResidentPushNotification {
  const ResidentPushNotification({required this.title, required this.body});

  final String title;
  final String body;
}

class NotificationService {
  NotificationService({
    AudioPlayer? audioPlayer,
    DioClient? client,
    this.fileCache,
    FlutterLocalNotificationsPlugin? localNotifications,
    this._messaging,
  }) : _audioPlayer = audioPlayer ?? AudioPlayer(),
       _client = client ?? DioClient(),
       _localNotifications =
           localNotifications ?? FlutterLocalNotificationsPlugin();

  final AudioPlayer _audioPlayer;
  final DioClient _client;
  final ApiFileCacheService? fileCache;
  final FlutterLocalNotificationsPlugin _localNotifications;
  final FirebaseMessaging? _messaging;
  Timer? _timer;
  PrayerAlarmSchedule? _lastSchedule;
  StreamSubscription<RemoteMessage>? _foregroundMessages;
  StreamSubscription<String>? _tokenRefresh;

  static String? _lastPushToken;
  static bool _localNotificationsReady = false;

  PrayerAlarmSchedule? get lastSchedule => _lastSchedule;

  Future<void> initializePush() async {
    await _ensureInstanceLocalNotifications();
    if (kIsWeb) return;
    if (!await _ensureFirebase()) return;

    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    final messaging = _messaging ?? FirebaseMessaging.instance;
    await messaging.requestPermission(alert: true, badge: true, sound: true);
    final token = await _readMessagingToken(messaging);
    if (token != null) {
      await _registerDeviceToken(token);
    }

    await _foregroundMessages?.cancel();
    _foregroundMessages = FirebaseMessaging.onMessage.listen((message) {
      unawaited(showResidentPushData(message.data));
    });

    await _tokenRefresh?.cancel();
    _tokenRefresh = messaging.onTokenRefresh.listen((token) {
      _lastPushToken = token;
      unawaited(_registerDeviceToken(token));
    });
  }

  static Future<Map<String, Object?>?> residentPushTokenPayload() async {
    if (kIsWeb) return null;
    if (!await _ensureFirebase()) return null;

    final token =
        _lastPushToken ?? await _readMessagingToken(FirebaseMessaging.instance);
    if (token == null) return null;

    return {'push_token': token, 'push_platform': _platformName()};
  }

  Future<void> scheduleDaily({
    required PrayerTimes prayerTimes,
    required String adzanUrl,
    DateTime? now,
  }) async {
    _timer?.cancel();
    _lastSchedule = nextPrayer(prayerTimes, now: now);
    final reference = now ?? DateTime.now();
    final delay = _lastSchedule!.scheduledAt.difference(reference);

    _timer = Timer(delay.isNegative ? Duration.zero : delay, () async {
      if (adzanUrl.isNotEmpty) {
        await _playAdzan(adzanUrl);
      }
    });
  }

  Future<void> _playAdzan(String adzanUrl) async {
    final currentFileCache = fileCache;
    if (currentFileCache == null) {
      await _audioPlayer.play(UrlSource(adzanUrl));
      return;
    }

    final cacheKey = apiFileCacheKey(url: adzanUrl);
    try {
      final res = await _client.dio.get<List<int>>(
        adzanUrl,
        options: Options(responseType: ResponseType.bytes),
      );
      final data = res.data;
      if (data == null || data.isEmpty) throw StateError('Audio azan kosong.');
      final bytes = Uint8List.fromList(data);
      await currentFileCache.putBytes(cacheKey, bytes);
      await _audioPlayer.play(BytesSource(bytes));
    } catch (_) {
      final cached = currentFileCache.getBytes(cacheKey);
      if (cached != null) {
        await _audioPlayer.play(BytesSource(cached.bytes));
        return;
      }
      rethrow;
    }
  }

  Future<void> cancel() async {
    _timer?.cancel();
    _timer = null;
    _lastSchedule = null;
    await _audioPlayer.stop();
  }

  Future<void> dispose() async {
    _timer?.cancel();
    await _foregroundMessages?.cancel();
    await _tokenRefresh?.cancel();
    await _audioPlayer.dispose();
  }

  static ResidentPushNotification? residentNotificationFromData(
    Map<String, dynamic> data,
  ) {
    final event = data['event']?.toString();
    final referenceCode = data['reference_code']?.toString();
    final suffix = referenceCode == null || referenceCode.isEmpty
        ? ''
        : ' ($referenceCode)';

    switch (event) {
      case 'SENT':
        return ResidentPushNotification(
          title: 'Surat Anda sudah dikirim',
          body: 'Surat$suffix sudah dikirim ke email Anda.',
        );
      case 'REJECTED':
        return ResidentPushNotification(
          title: 'Permohonan surat ditolak',
          body: 'Permohonan$suffix ditolak. Silakan cek status permohonan.',
        );
      case 'NEEDS_INFO':
        return ResidentPushNotification(
          title: 'Permohonan perlu dilengkapi',
          body: 'Permohonan$suffix membutuhkan informasi tambahan.',
        );
      default:
        return null;
    }
  }

  static Future<void> showResidentPushData(Map<String, dynamic> data) async {
    final notification = residentNotificationFromData(data);
    if (notification == null || kIsWeb) return;

    final localNotifications = FlutterLocalNotificationsPlugin();
    await _ensureStaticLocalNotifications(localNotifications);
    await localNotifications.show(
      id: notification.hashCode & 0x7fffffff,
      title: notification.title,
      body: notification.body,
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'resident_letters',
          'Status surat warga',
          channelDescription: 'Pembaruan status permohonan surat warga',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
        macOS: DarwinNotificationDetails(),
      ),
    );
  }

  static PrayerAlarmSchedule nextPrayer(
    PrayerTimes prayerTimes, {
    DateTime? now,
  }) {
    final reference = now ?? DateTime.now();
    final slots = [
      ('Subuh', prayerTimes.subuh),
      ('Dhuhur', prayerTimes.dhuhur),
      ('Ashar', prayerTimes.ashar),
      ('Maghrib', prayerTimes.maghrib),
      ('Isya', prayerTimes.isya),
    ];

    for (final slot in slots) {
      final scheduledAt = _dateTimeFor(reference, slot.$2);
      if (scheduledAt.isAfter(reference)) {
        return PrayerAlarmSchedule(
          prayerName: slot.$1,
          scheduledAt: scheduledAt,
        );
      }
    }

    return PrayerAlarmSchedule(
      prayerName: 'Subuh',
      scheduledAt: _dateTimeFor(
        reference.add(const Duration(days: 1)),
        prayerTimes.subuh,
      ),
    );
  }

  static DateTime _dateTimeFor(DateTime date, String time) {
    final parts = time.split(':');
    final hour = int.tryParse(parts.first) ?? 0;
    final minute = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
    return DateTime(date.year, date.month, date.day, hour, minute);
  }

  Future<void> _registerDeviceToken(String token) async {
    _lastPushToken = token;
    try {
      await _client.dio.post<Map<String, Object?>>(
        '/notifications/device-tokens',
        data: {'token': token, 'platform': _platformName()},
      );
    } on DioException {
      // Push registration should not block the resident app.
    }
  }

  Future<void> _ensureInstanceLocalNotifications() {
    return _ensureStaticLocalNotifications(_localNotifications);
  }

  static Future<void> _ensureStaticLocalNotifications([
    FlutterLocalNotificationsPlugin? plugin,
  ]) async {
    if (_localNotificationsReady) return;
    final localNotifications = plugin ?? FlutterLocalNotificationsPlugin();
    try {
      await localNotifications.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(),
          macOS: DarwinInitializationSettings(),
        ),
      );
      _localNotificationsReady = true;
    } catch (_) {
      // Push/local notification setup should never prevent the app from opening.
    }
  }

  static Future<bool> _ensureFirebase() async {
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        );
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  static Future<String?> _readMessagingToken(
    FirebaseMessaging messaging,
  ) async {
    try {
      final token = await messaging.getToken();
      _lastPushToken = token;
      return token;
    } catch (_) {
      return null;
    }
  }

  static String _platformName() {
    if (kIsWeb) return 'web';
    return switch (defaultTargetPlatform) {
      TargetPlatform.android => 'android',
      TargetPlatform.iOS => 'ios',
      _ => 'unknown',
    };
  }
}
