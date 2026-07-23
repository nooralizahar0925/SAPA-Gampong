import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/core/network/dio_client.dart';
import 'package:sapa_gampong/data/models/attachment.dart';
import 'package:sapa_gampong/data/models/letter_request.dart';
import 'package:sapa_gampong/data/repositories/letter_repository.dart';
import 'package:sapa_gampong/data/services/content_cache_service.dart';

// Builds a DioClient whose Dio is pre-wired with a stub interceptor.
DioClient _stubClient(Map<String, dynamic> Function(RequestOptions) handler) {
  final dio = Dio(BaseOptions(baseUrl: 'http://test/api'));
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, h) {
        final data = handler(options);
        h.resolve(
          Response(
            requestOptions: options,
            statusCode: data['_status'] as int? ?? 200,
            data: data['_body'],
          ),
        );
      },
    ),
  );
  return DioClient(baseUrl: 'http://test/api', dio: dio);
}

void main() {
  group('LetterRepository', () {
    test('letterTypes() returns parsed list from GET /letter-types', () async {
      final client = _stubClient(
        (_) => {
          '_body': [
            {
              'code': 'L1',
              'name': 'Surat Keterangan Berdomisili',
              'description': 'Keterangan domisili warga.',
              'subject_is_applicant': true,
              'required_attachments': ['KTP', 'KK'],
              'fields': [
                {
                  'key': 'nama',
                  'label': 'Nama',
                  'type': 'text',
                  'required': true,
                },
                {'key': 'nik', 'label': 'NIK', 'type': 'nik', 'required': true},
                {
                  'key': 'jenis_kelamin',
                  'label': 'Jenis Kelamin',
                  'type': 'enum',
                  'required': true,
                  'options': ['Laki-laki', 'Perempuan'],
                },
              ],
            },
          ],
        },
      );

      final repo = LetterRepository(client);
      final types = await repo.letterTypes();

      expect(types.length, 1);
      expect(types.first.code, 'L1');
      expect(types.first.requiredAttachments, ['KTP', 'KK']);
      expect(types.first.fields.length, 3);
      // third field is nik type
      expect(types.first.fields[1].type.wireName, 'nik');
    });

    test(
      'submit() posts draft and returns GB-prefixed reference code',
      () async {
        Map<String, dynamic>? postedBody;
        final repo = LetterRepository(
          _stubClient((options) {
            postedBody = Map<String, dynamic>.from(options.data as Map);
            return {
              '_status': 201,
              '_body': {
                'id': 'req_01H',
                'reference_code': 'GB-2026-000123',
                'status': 'SUBMITTED',
              },
            };
          }),
          pushTokenPayload: () async => {
            'push_token': 'fcm-token',
            'push_platform': 'android',
          },
        );
        final draft = LetterRequestDraft(
          letterType: 'L1',
          applicantName: 'Budi Santoso',
          applicantEmail: 'budi@mail.com',
          applicantPhone: '081234567890',
          subjectData: {'nama': 'Budi Santoso', 'nik': '1607000000000001'},
          attachments: [const Attachment(fileId: 'f_01H', kind: 'KTP')],
        );

        final result = await repo.submit(draft);

        expect(result.referenceCode, startsWith('GB-'));
        expect(result.referenceCode, 'GB-2026-000123');
        expect(result.status, 'SUBMITTED');
        expect(postedBody?['push_token'], 'fcm-token');
        expect(postedBody?['push_platform'], 'android');
      },
    );

    test('track() returns status label for a reference code', () async {
      final client = _stubClient(
        (_) => {
          '_body': {
            'reference_code': 'GB-2026-000123',
            'letter_type': 'L1',
            'status': 'IN_REVIEW',
            'status_label': 'Sedang ditinjau',
            'updated_at': '2026-07-02T03:00:00.000Z',
          },
        },
      );

      final repo = LetterRepository(client);
      final status = await repo.track('GB-2026-000123');

      expect(status.referenceCode, 'GB-2026-000123');
      expect(status.status, 'IN_REVIEW');
      expect(status.statusLabel, 'Sedang ditinjau');
    });

    test(
      'letterTypes() falls back to cached list when API is offline',
      () async {
        var offline = false;
        final dio = Dio(BaseOptions(baseUrl: 'http://test/api'));
        dio.interceptors.add(
          InterceptorsWrapper(
            onRequest: (options, handler) {
              if (offline) {
                handler.reject(
                  DioException(
                    requestOptions: options,
                    type: DioExceptionType.connectionError,
                    message: 'offline',
                  ),
                );
                return;
              }

              handler.resolve(
                Response<List<dynamic>>(
                  requestOptions: options,
                  statusCode: 200,
                  data: const [
                    {
                      'code': 'L1',
                      'name': 'Surat Keterangan Berdomisili',
                      'description': 'Keterangan domisili warga.',
                      'subject_is_applicant': true,
                      'required_attachments': ['KTP', 'KK'],
                      'fields': [],
                    },
                  ],
                ),
              );
            },
          ),
        );

        final cache = MemoryContentCacheService();
        final repo = LetterRepository(DioClient(dio: dio), cache: cache);

        expect((await repo.letterTypes()).single.code, 'L1');
        expect(cache.updatedAt(ContentCacheKeys.letterTypes), isNotNull);

        offline = true;
        expect((await repo.letterTypes()).single.name, contains('Berdomisili'));
      },
    );

    test('track() falls back to cached status when API is offline', () async {
      var offline = false;
      final dio = Dio(BaseOptions(baseUrl: 'http://test/api'));
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            if (offline) {
              handler.reject(
                DioException(
                  requestOptions: options,
                  type: DioExceptionType.connectionError,
                  message: 'offline',
                ),
              );
              return;
            }

            handler.resolve(
              Response<Map<String, Object?>>(
                requestOptions: options,
                statusCode: 200,
                data: const {
                  'reference_code': 'GB-2026-000123',
                  'letter_type': 'L1',
                  'status': 'IN_REVIEW',
                  'status_label': 'Sedang ditinjau',
                  'updated_at': '2026-07-02T03:00:00.000Z',
                },
              ),
            );
          },
        ),
      );

      final repo = LetterRepository(
        DioClient(dio: dio),
        cache: MemoryContentCacheService(),
      );

      expect((await repo.track('gb-2026-000123')).status, 'IN_REVIEW');

      offline = true;
      expect(
        (await repo.track('GB-2026-000123')).statusLabel,
        'Sedang ditinjau',
      );
    });
  });
}
