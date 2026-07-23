import 'attachment.dart';

class FeedbackDraft {
  const FeedbackDraft({
    required this.name,
    required this.email,
    required this.body,
    this.phone,
    this.attachments = const [],
  });

  final String name;
  final String email;
  final String? phone;
  final String body;
  final List<Attachment> attachments;

  Map<String, Object?> toJson() {
    return {
      'name': name,
      'email': email,
      'phone': phone,
      'body': body,
      'attachments': [
        for (final attachment in attachments)
          {'file_id': attachment.fileId, 'kind': attachment.kind},
      ],
    };
  }
}

class FeedbackCreated {
  const FeedbackCreated({
    required this.id,
    required this.referenceCode,
    required this.status,
  });

  final String id;
  final String referenceCode;
  final String status;

  factory FeedbackCreated.fromJson(Map<String, Object?> json) {
    return FeedbackCreated(
      id: json['id'] as String? ?? '',
      referenceCode: json['reference_code'] as String? ?? '',
      status: json['status'] as String? ?? 'new',
    );
  }
}
