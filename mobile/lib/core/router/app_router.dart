import 'package:go_router/go_router.dart';

import '../../data/mock/letter_seed.dart';
import '../../data/models/letter_type.dart';
import '../../features/demographics/demographics_screen.dart';
import '../../features/feedback/feedback_screen.dart';
import '../../features/feedback/my_feedback_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/letters/attachment_screen.dart';
import '../../features/letters/letter_catalog_screen.dart';
import '../../features/letters/letter_form_screen.dart';
import '../../features/letters/my_requests_screen.dart';
import '../../features/letters/purpose_screen.dart';
import '../../features/letters/review_screen.dart';
import '../../features/letters/success_screen.dart';
import '../../features/letters/tracking_screen.dart';
import '../../features/news/news_screen.dart';
import '../../features/prayer/prayer_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/services/services_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/verification/verification_screen.dart';

class AppRouteNames {
  const AppRouteNames._();

  static const splash = 'splash';
  static const home = 'home';
  static const services = 'services';
  static const news = 'news';
  static const settings = 'settings';
  static const letterCatalog = 'letterCatalog';
  static const letterForm = 'letterForm';
  static const purpose = 'purpose';
  static const attachments = 'attachments';
  static const review = 'review';
  static const success = 'success';
  static const tracking = 'tracking';
  static const myRequests = 'myRequests';
  static const profile = 'profile';
  static const prayer = 'prayer';
  static const demographics = 'demographics';
  static const feedback = 'feedback';
  static const myFeedback = 'myFeedback';
  static const verify = 'verify';
}

class AppRouter {
  const AppRouter._();

  static GoRouter get router => GoRouter(
    initialLocation: '/splash',
    routes: [
      GoRoute(
        path: '/splash',
        name: AppRouteNames.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/',
        name: AppRouteNames.home,
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/layanan',
        name: AppRouteNames.services,
        builder: (context, state) => const ServicesScreen(),
      ),
      GoRoute(
        path: '/berita',
        name: AppRouteNames.news,
        builder: (context, state) => const NewsScreen(),
      ),
      GoRoute(
        path: '/pengaturan',
        name: AppRouteNames.settings,
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/layanan/surat',
        name: AppRouteNames.letterCatalog,
        builder: (context, state) => const LetterCatalogScreen(),
      ),
      GoRoute(
        path: '/layanan/surat/form',
        name: AppRouteNames.letterForm,
        builder: (context, state) {
          final extra = state.extra;
          if (extra is LetterType) return LetterFormScreen(letterType: extra);
          // Fallback: should not happen in normal flow — return to catalog.
          return const LetterCatalogScreen();
        },
      ),
      GoRoute(
        path: '/layanan/surat/tujuan',
        name: AppRouteNames.purpose,
        builder: (context, state) {
          final flowDraft = state.extra;
          return PurposeScreen(
            flowDraft: flowDraft is LetterFlowDraft
                ? flowDraft
                : LetterFlowDraft.sample(letterTypeByCode('L1')),
          );
        },
      ),
      GoRoute(
        path: '/layanan/surat/lampiran',
        name: AppRouteNames.attachments,
        builder: (context, state) {
          final flowDraft = state.extra;
          return AttachmentScreen(
            flowDraft: flowDraft is LetterFlowDraft
                ? flowDraft
                : LetterFlowDraft.sample(letterTypeByCode('L1')),
          );
        },
      ),
      GoRoute(
        path: '/layanan/surat/ringkasan',
        name: AppRouteNames.review,
        builder: (context, state) {
          final flowDraft = state.extra;
          return ReviewScreen(
            flowDraft: flowDraft is LetterFlowDraft
                ? flowDraft
                : LetterFlowDraft.sample(letterTypeByCode('L4')),
          );
        },
      ),
      GoRoute(
        path: '/layanan/surat/berhasil',
        name: AppRouteNames.success,
        builder: (context, state) {
          final flowDraft = state.extra;
          return SuccessScreen(
            flowDraft: flowDraft is LetterFlowDraft
                ? flowDraft
                : LetterFlowDraft.sample(letterTypeByCode('L4')),
          );
        },
      ),
      GoRoute(
        path: '/lacak',
        name: AppRouteNames.tracking,
        builder: (context, state) => const TrackingScreen(),
      ),
      GoRoute(
        path: '/permohonan-saya',
        name: AppRouteNames.myRequests,
        builder: (context, state) => const MyRequestsScreen(),
      ),
      GoRoute(
        path: '/profil',
        name: AppRouteNames.profile,
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/jadwal-sholat',
        name: AppRouteNames.prayer,
        builder: (context, state) => const PrayerScreen(),
      ),
      GoRoute(
        path: '/demografi',
        name: AppRouteNames.demographics,
        builder: (context, state) => const DemographicsScreen(),
      ),
      GoRoute(
        path: '/pelaporan',
        name: AppRouteNames.feedback,
        builder: (context, state) => const FeedbackScreen(),
      ),
      GoRoute(
        path: '/laporan-saya',
        name: AppRouteNames.myFeedback,
        builder: (context, state) => const MyFeedbackScreen(),
      ),
      GoRoute(
        path: '/verify',
        name: AppRouteNames.verify,
        builder: (context, state) => const VerificationScreen(),
      ),
      GoRoute(
        path: '/verify/:token',
        builder: (context, state) =>
            VerificationScreen(initialToken: state.pathParameters['token']),
      ),
    ],
  );
}
