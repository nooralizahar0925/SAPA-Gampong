import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/core/network/api_exception.dart';

void main() {
  test('maps API error envelope from DioException', () {
    final requestOptions = RequestOptions(path: '/requests');
    final dioError = DioException(
      requestOptions: requestOptions,
      response: Response<Map<String, Object?>>(
        requestOptions: requestOptions,
        statusCode: 400,
        data: const {
          'error': {
            'code': 'VALIDATION_ERROR',
            'message': 'NIK harus 16 digit',
            'fields': {'nik': 'harus 16 digit'},
          },
        },
      ),
    );

    final exception = ApiException.fromDioError(dioError);

    expect(exception.code, 'VALIDATION_ERROR');
    expect(exception.message, 'NIK harus 16 digit');
    expect(exception.fields['nik'], 'harus 16 digit');
    expect(exception.statusCode, 400);
  });
}
