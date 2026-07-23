import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/core/network/dio_client.dart';
import 'package:sapa_gampong/data/services/submission_queue_service.dart';

void main() {
  test(
    'retryPending posts queued submissions and removes successful items',
    () async {
      final postedPaths = <String>[];
      final dio = Dio(BaseOptions(baseUrl: 'http://test'));
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            postedPaths.add(options.path);
            handler.resolve(Response(requestOptions: options, statusCode: 201));
          },
        ),
      );

      final queue = MemorySubmissionQueueService(DioClient(dio: dio));
      await queue.enqueueLetter({'letter_type': 'L1'});
      await queue.enqueueFeedback({'body': 'Lampu jalan mati'});

      expect(queue.pending(), hasLength(2));

      final sent = await queue.retryPending();

      expect(sent, 2);
      expect(postedPaths, ['/requests', '/feedback']);
      expect(queue.pending(), isEmpty);
    },
  );

  test('retryPending keeps failed items queued', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.reject(
            DioException(
              requestOptions: options,
              type: DioExceptionType.connectionError,
              message: 'offline',
            ),
          );
        },
      ),
    );

    final queue = MemorySubmissionQueueService(DioClient(dio: dio));
    await queue.enqueueLetter({'letter_type': 'L1'});

    final sent = await queue.retryPending();

    expect(sent, 0);
    expect(queue.pending(), hasLength(1));
  });
}
