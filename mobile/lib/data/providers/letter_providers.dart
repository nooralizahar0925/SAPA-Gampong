import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/dio_client.dart';
import '../models/letter_type.dart';
import '../repositories/letter_repository.dart';
import '../services/attachment_file_picker_service.dart';
import '../services/notification_service.dart';
import '../services/upload_service.dart';
import 'cache_providers.dart';

final dioClientProvider = Provider<DioClient>((ref) => DioClient());

final letterRepositoryProvider = Provider<LetterRepository>((ref) {
  return LetterRepository(
    ref.watch(dioClientProvider),
    pushTokenPayload: NotificationService.residentPushTokenPayload,
    cache: ref.watch(contentCacheServiceProvider),
  );
});

final uploadServiceProvider = Provider<UploadService>((ref) {
  return UploadService(ref.watch(dioClientProvider));
});

final attachmentFilePickerProvider = Provider<AttachmentFilePickerService>((
  ref,
) {
  return AttachmentFilePickerService();
});

final letterTypesProvider = FutureProvider<List<LetterType>>((ref) {
  return ref.watch(letterRepositoryProvider).letterTypes();
});
