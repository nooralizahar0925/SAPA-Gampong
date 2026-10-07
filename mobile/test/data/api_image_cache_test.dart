import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:sapa_gampong/data/services/content_cache_service.dart';

void main() {
  test('fresh cached bytes are returned without a network request', () async {
    final cache = MemoryApiFileCacheService();
    final bytes = Uint8List.fromList([1, 2, 3]);
    await cache.putBytes('photo', bytes);
    final result = await cache.getOrFetchBytes(
      key: 'photo',
      fetch: () => throw StateError('Network must not run'),
    );
    expect(result, bytes);
  });

  test('simultaneous requests share a single download', () async {
    final cache = MemoryApiFileCacheService();
    final response = Completer<Uint8List>();
    var calls = 0;
    Future<Uint8List> fetch() {
      calls++;
      return response.future;
    }

    final first = cache.getOrFetchBytes(key: 'photo', fetch: fetch);
    final second = cache.getOrFetchBytes(key: 'photo', fetch: fetch);
    response.complete(Uint8List.fromList([1]));
    expect(await first, await second);
    expect(calls, 1);
  });

  test('expired cache refreshes, retaining offline fallback', () async {
    final cache = MemoryApiFileCacheService();
    await cache.putBytes('photo', Uint8List.fromList([1]));
    expect(
      await cache.getOrFetchBytes(
        key: 'photo',
        maxAge: Duration.zero,
        fetch: () async => Uint8List.fromList([2]),
      ),
      [2],
    );
    expect(
      await cache.getOrFetchBytes(
        key: 'photo',
        maxAge: Duration.zero,
        fetch: () => throw StateError('Offline'),
      ),
      [2],
    );
  });

  test('signed URL rotation keeps the same key; replacement file does not', () {
    final first = apiFileCacheKey(fileId: 'one', url: 'https://host/a?sig=1');
    expect(apiFileCacheKey(fileId: 'one', url: 'https://host/a?sig=2'), first);
    expect(apiFileCacheKey(fileId: 'two', url: 'https://host/b'), isNot(first));
  });

  test(
    'failed downloads can be retried without a stuck pending request',
    () async {
      final cache = MemoryApiFileCacheService();
      await expectLater(
        cache.getOrFetchBytes(
          key: 'photo',
          fetch: () => throw StateError('Offline'),
        ),
        throwsStateError,
      );
      expect(
        await cache.getOrFetchBytes(
          key: 'photo',
          fetch: () async => Uint8List.fromList([3]),
        ),
        [3],
      );
    },
  );
}
