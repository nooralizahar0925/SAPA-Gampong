import 'package:flutter_test/flutter_test.dart';

import '../support/letter_flow_harness.dart';

void main() {
  testWidgets('resident can complete a mock letter request flow', (
    tester,
  ) async {
    await runLetterFlow(tester);
  });
}
