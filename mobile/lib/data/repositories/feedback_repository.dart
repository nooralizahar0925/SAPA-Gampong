import '../../core/network/dio_client.dart';
import '../models/feedback_model.dart';
import '../services/notification_service.dart';

class FeedbackRepository {
  FeedbackRepository(this._client);

  final DioClient _client;

  Future<FeedbackCreated> submit(FeedbackDraft draft) async {
    final pushPayload = await NotificationService.residentPushTokenPayload();
    final res = await _client.dio.post<Map<String, Object?>>(
      '/feedback',
      data: {...draft.toJson(), ...?pushPayload},
    );
    return FeedbackCreated.fromJson(res.data ?? {});
  }
}
