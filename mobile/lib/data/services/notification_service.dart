import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/services.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import '../../core/network/dio_client.dart';
import '../../firebase_options.dart';
import '../models/resident_session.dart';
import 'app_preferences_service.dart';
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

class AdzanAlarmPermissionException implements Exception {
  const AdzanAlarmPermissionException(this.message);

  final String message;

  @override
  String toString() => message;
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
  static bool _timezoneReady = false;

  static const _adzanAlarmChannelId = 'adzan_alarm_v4';
  static const _adzanAlarmChannelName = 'Alarm azan';
  static const _adzanSoundResource = 'adzan_short';
  static const _adzanSoundFile = 'adzan_short.caf';
  static const _adzanNotificationIds = <String, int>{
    'Subuh': 51001,
    'Dhuhur': 51002,
    'Ashar': 51003,
    'Maghrib': 51004,
    'Isya': 51005,
  };

  PrayerAlarmSchedule? get lastSchedule => _lastSchedule;

  Future<void> initializePush({
    AppPreferences? preferences,
    Future<AppPreferences> Function()? preferencesLoader,
    Future<ResidentSession?> Function()? residentSessionLoader,
  }) async {
    await _ensureStaticLocalNotifications(_localNotifications);
    if (kIsWeb) return;
    if (!await _ensureFirebase()) return;

    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    final messaging = _messaging ?? FirebaseMessaging.instance;
    await messaging.requestPermission(alert: true, badge: true, sound: true);
    final token = await _readMessagingToken(messaging);
    final startupPreferences =
        preferences ??
        (preferencesLoader == null ? null : await preferencesLoader());
    if (token != null) {
      await _registerDeviceToken(token, preferences: startupPreferences);
      final session = await residentSessionLoader?.call();
      if (session != null) await linkResidentDevice(session, token: token);
    }

    await _foregroundMessages?.cancel();
    _foregroundMessages = FirebaseMessaging.onMessage.listen((message) {
      unawaited(showResidentPushData(message.data));
    });

    await _tokenRefresh?.cancel();
    _tokenRefresh = messaging.onTokenRefresh.listen((token) async {
      _lastPushToken = token;
      final latestPreferences = preferencesLoader == null
          ? preferences
          : await preferencesLoader();
      await _registerDeviceToken(token, preferences: latestPreferences);
      final session = await residentSessionLoader?.call();
      if (session != null) await linkResidentDevice(session, token: token);
    });
  }

  Future<void> linkResidentDevice(
    ResidentSession session, {
    String? token,
  }) async {
    if (kIsWeb || session.isExpired || !await _ensureFirebase()) return;

    final currentToken =
        token ??
        _lastPushToken ??
        await _readMessagingToken(FirebaseMessaging.instance);
    if (currentToken == null) return;

    try {
      await _client.dio.post<Map<String, Object?>>(
        '/resident/device-token',
        data: {'token': currentToken, 'platform': _platformName()},
        options: Options(
          headers: {'Authorization': 'Bearer ${session.token}'},
        ),
      );
    } on DioException catch (error) {
      debugPrint('Failed to link resident push token: $error');
    }
  }

  Future<void> syncDevicePreferences(AppPreferences preferences) async {
    if (kIsWeb) return;
    if (!await _ensureFirebase()) return;

    final token =
        _lastPushToken ?? await _readMessagingToken(FirebaseMessaging.instance);
    if (token == null) return;

    await _syncDevicePreferences(token, preferences);
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
    await _scheduleNativeAdzanAlarms(prayerTimes, now: now);
    unawaited(_cacheAdzanAudio(adzanUrl));

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
    final cached = currentFileCache.getBytes(cacheKey);
    if (cached != null) {
      await _audioPlayer.play(BytesSource(cached.bytes));
      return;
    }

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

  Future<void> _cacheAdzanAudio(String adzanUrl) async {
    final currentFileCache = fileCache;
    if (currentFileCache == null || adzanUrl.isEmpty) return;

    final cacheKey = apiFileCacheKey(url: adzanUrl);
    if (currentFileCache.getBytes(cacheKey) != null) return;

    try {
      final res = await _client.dio.get<List<int>>(
        adzanUrl,
        options: Options(responseType: ResponseType.bytes),
      );
      final data = res.data;
      if (data == null || data.isEmpty) return;
      await currentFileCache.putBytes(cacheKey, Uint8List.fromList(data));
    } catch (error) {
      debugPrint('Failed to cache full adzan audio: $error');
    }
  }

  Future<bool> hasScheduledAdzanAlarms() async {
    if (kIsWeb) return false;
    try {
      await _ensureInstanceLocalNotifications();
      final pending = await _localNotifications.pendingNotificationRequests();
      final ids = _adzanNotificationIds.values.toSet();
      return pending.where((item) => ids.contains(item.id)).length ==
          ids.length;
    } catch (error) {
      debugPrint('Failed to inspect scheduled adzan alarms: $error');
      return false;
    }
  }

  Future<void> cancel() async {
    _timer?.cancel();
    _timer = null;
    _lastSchedule = null;
    await _cancelNativeAdzanAlarms();
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
      case 'SUBMITTED':
        return ResidentPushNotification(
          title: 'Permohonan surat diterima',
          body: 'Permohonan$suffix sudah tercatat dan menunggu diproses.',
        );
      case 'IN_REVIEW':
        return ResidentPushNotification(
          title: 'Permohonan sedang ditinjau',
          body: 'Permohonan$suffix sedang ditinjau petugas.',
        );
      case 'NEEDS_INFO':
        return ResidentPushNotification(
          title: 'Permohonan perlu dilengkapi',
          body: 'Permohonan$suffix membutuhkan informasi tambahan.',
        );
      case 'APPROVED':
        return ResidentPushNotification(
          title: 'Permohonan surat disetujui',
          body: 'Permohonan$suffix sudah disetujui dan akan dibuatkan surat.',
        );
      case 'GENERATED':
        return ResidentPushNotification(
          title: 'Surat selesai dibuat',
          body: 'Surat$suffix sudah dibuat dan menunggu pengiriman.',
        );
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
      case 'CANCELED':
        return ResidentPushNotification(
          title: 'Permohonan dibatalkan',
          body: 'Permohonan$suffix telah dibatalkan.',
        );
      case 'FEEDBACK_NEW':
        return ResidentPushNotification(
          title: 'Laporan diterima',
          body: 'Laporan$suffix sudah diterima kantor keuchik.',
        );
      case 'FEEDBACK_READ':
        return ResidentPushNotification(
          title: 'Laporan sedang ditinjau',
          body: 'Laporan$suffix sedang ditinjau petugas.',
        );
      case 'FEEDBACK_RESPONDED':
        return ResidentPushNotification(
          title: 'Laporan Anda dibalas',
          body: 'Laporan$suffix sudah mendapat balasan.',
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

  Future<void> _scheduleNativeAdzanAlarms(
    PrayerTimes prayerTimes, {
    DateTime? now,
  }) async {
    if (kIsWeb) return;

    await _ensureInstanceLocalNotifications();
    final androidScheduleMode = await _prepareAdzanNotificationPermissions();
    await _cancelNativeAdzanAlarms();
    _ensureTimezone();

    final reference = now ?? DateTime.now();
    final slots = [
      ('Subuh', prayerTimes.subuh),
      ('Dhuhur', prayerTimes.dhuhur),
      ('Ashar', prayerTimes.ashar),
      ('Maghrib', prayerTimes.maghrib),
      ('Isya', prayerTimes.isya),
    ];

    for (final slot in slots) {
      final scheduledToday = _dateTimeFor(reference, slot.$2);
      final scheduledAt = scheduledToday.isAfter(reference)
          ? scheduledToday
          : scheduledToday.add(const Duration(days: 1));

      await _scheduleAdzanSlot(
        id: _adzanNotificationIds[slot.$1]!,
        prayerName: slot.$1,
        scheduledAt: scheduledAt,
        preferredMode: androidScheduleMode,
      );
    }

    // Some Android vendors update pendingNotificationRequests asynchronously.
    // A successful zonedSchedule call is the reliable signal here; startup will
    // repair any genuinely missing schedules on the next app launch.
  }

  Future<void> _scheduleAdzanSlot({
    required int id,
    required String prayerName,
    required DateTime scheduledAt,
    required AndroidScheduleMode preferredMode,
  }) async {
    Future<void> schedule(AndroidScheduleMode mode) {
      return _localNotifications.zonedSchedule(
        id: id,
        title: 'Waktu $prayerName',
        body: 'Alarm azan $prayerName aktif.',
        scheduledDate: tz.TZDateTime.from(scheduledAt, tz.local),
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            _adzanAlarmChannelId,
            _adzanAlarmChannelName,
            channelDescription: 'Pengingat waktu sholat dengan suara azan',
            importance: Importance.max,
            priority: Priority.high,
            sound: RawResourceAndroidNotificationSound(_adzanSoundResource),
            audioAttributesUsage: AudioAttributesUsage.alarm,
          ),
          iOS: DarwinNotificationDetails(
            sound: _adzanSoundFile,
            presentAlert: true,
            presentSound: true,
            presentBanner: true,
            presentList: true,
          ),
          macOS: DarwinNotificationDetails(
            sound: _adzanSoundFile,
            presentAlert: true,
            presentSound: true,
            presentBanner: true,
            presentList: true,
          ),
        ),
        androidScheduleMode: mode,
        matchDateTimeComponents: DateTimeComponents.time,
        payload: 'adzan:$prayerName',
      );
    }

    try {
      await schedule(preferredMode);
    } on PlatformException catch (error) {
      final exactMode =
          preferredMode == AndroidScheduleMode.exact ||
          preferredMode == AndroidScheduleMode.exactAllowWhileIdle ||
          preferredMode == AndroidScheduleMode.alarmClock;
      if (defaultTargetPlatform == TargetPlatform.android &&
          exactMode &&
          error.code == 'exact_alarms_not_permitted') {
        try {
          await schedule(AndroidScheduleMode.inexactAllowWhileIdle);
          return;
        } catch (fallbackError) {
          debugPrint(
            'Failed to schedule $prayerName with inexact fallback: '
            '$fallbackError',
          );
          throw AdzanAlarmPermissionException(
            'Alarm $prayerName gagal dijadwalkan di perangkat ini.',
          );
        }
      }

      debugPrint('Failed to schedule $prayerName adzan: $error');
      throw AdzanAlarmPermissionException(
        'Alarm $prayerName gagal dijadwalkan: '
        '${error.message ?? error.code}',
      );
    } catch (error) {
      debugPrint('Failed to schedule $prayerName adzan: $error');
      throw AdzanAlarmPermissionException(
        'Alarm $prayerName gagal dijadwalkan di perangkat ini.',
      );
    }
  }

  Future<void> _cancelNativeAdzanAlarms() async {
    if (kIsWeb) return;

    try {
      for (final id in _adzanNotificationIds.values) {
        await _localNotifications.cancel(id: id);
      }
    } catch (_) {
      // Tests and some platforms may not have a native notification backend.
    }
  }

  Future<AndroidScheduleMode> _prepareAdzanNotificationPermissions() async {
    try {
      final android = _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      final notificationsGranted = await android
          ?.requestNotificationsPermission();
      if (notificationsGranted == false) {
        throw const AdzanAlarmPermissionException(
          'Izin notifikasi diperlukan untuk alarm azan.',
        );
      }
      if (defaultTargetPlatform != TargetPlatform.android) {
        return AndroidScheduleMode.exactAllowWhileIdle;
      }

      final canScheduleExact =
          await android?.canScheduleExactNotifications() ?? true;
      if (canScheduleExact) return AndroidScheduleMode.exactAllowWhileIdle;

      // Android 12+ can deny exact alarms on a fresh install. A slightly less
      // precise background alarm is preferable to disabling adzan completely.
      return AndroidScheduleMode.inexactAllowWhileIdle;
    } on AdzanAlarmPermissionException {
      rethrow;
    } catch (error) {
      debugPrint('Adzan exact alarm permission check failed: $error');
      throw const AdzanAlarmPermissionException(
        'Alarm azan belum dapat dijadwalkan di perangkat ini.',
      );
    }
  }

  static void _ensureTimezone() {
    if (_timezoneReady) return;
    tz_data.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Jakarta'));
    _timezoneReady = true;
  }

  Future<void> _registerDeviceToken(
    String token, {
    AppPreferences? preferences,
  }) async {
    _lastPushToken = token;
    try {
      if (preferences == null) {
        await _client.dio.post<Map<String, Object?>>(
          '/notifications/device-tokens',
          data: {'token': token, 'platform': _platformName()},
        );
      } else {
        await _syncDevicePreferences(token, preferences);
      }
    } on DioException {
      // Push registration should not block the resident app.
    }
  }

  Future<void> _syncDevicePreferences(
    String token,
    AppPreferences preferences,
  ) {
    return _client.dio.patch<Map<String, Object?>>(
      '/notifications/device-tokens/preferences',
      data: {
        'token': token,
        'platform': _platformName(),
        'letter_status_notifications': preferences.letterStatusNotifications,
        'feedback_status_notifications':
            preferences.feedbackStatusNotifications,
        'announcement_notifications': preferences.villageAnnouncements,
      },
    );
  }

  Future<void> _ensureInstanceLocalNotifications() {
    return _ensureStaticLocalNotifications(
      _localNotifications,
      rethrowErrors: true,
    );
  }

  static Future<void> _ensureStaticLocalNotifications(
    FlutterLocalNotificationsPlugin? plugin, {
    bool rethrowErrors = false,
  }) async {
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
    } catch (error) {
      if (rethrowErrors) rethrow;
      debugPrint('Local notification initialization failed: $error');
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
