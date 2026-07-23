import 'package:sapa_gampong/data/models/resident_session.dart';
import 'package:sapa_gampong/data/services/resident_session_service.dart';

final testResidentSession = ResidentSession(
  email: 'warga@example.com',
  token: 'resident-token',
  expiresAt: DateTime(2099, 1, 1),
);

Future<ResidentSessionService> residentSessionService({
  ResidentSession? session,
  bool verified = true,
}) async {
  final service = ResidentSessionService.memory();
  final savedSession = session ?? (verified ? testResidentSession : null);
  if (savedSession != null) {
    await service.save(savedSession);
  }
  return service;
}
