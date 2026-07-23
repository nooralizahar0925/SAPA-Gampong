// Generated from the Firebase app configuration files in android/app and ios/Runner.
// Keep this in sync by rerunning FlutterFire configuration if the Firebase apps change.
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'Firebase web options are not configured for this project.',
      );
    }

    return switch (defaultTargetPlatform) {
      TargetPlatform.android => android,
      TargetPlatform.iOS => ios,
      _ => throw UnsupportedError(
        'Firebase options are only configured for Android and iOS.',
      ),
    };
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDWrl1i-rkOAa5h74_jaKtElzzN8eXhv-k',
    appId: '1:962715437463:android:04570ff258c4d06ad31cd2',
    messagingSenderId: '962715437463',
    projectId: 'sapa-gampong',
    storageBucket: 'sapa-gampong.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyCjl0ReiduSno4NMEnDVCWsS4odcwMsSYU',
    appId: '1:962715437463:ios:93b32aff60011b70d31cd2',
    messagingSenderId: '962715437463',
    projectId: 'sapa-gampong',
    storageBucket: 'sapa-gampong.firebasestorage.app',
    iosBundleId: 'id.gampongblang.sapaGampong',
  );
}
