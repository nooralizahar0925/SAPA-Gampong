import 'attachment.dart';

class ResidentSession {
  const ResidentSession({
    required this.email,
    required this.token,
    required this.expiresAt,
  });

  final String email;
  final String token;
  final DateTime expiresAt;

  bool get isExpired => !expiresAt.isAfter(DateTime.now());

  factory ResidentSession.fromJson(Map<String, Object?> json) {
    return ResidentSession(
      email: json['email'] as String? ?? '',
      token: json['token'] as String? ?? '',
      expiresAt:
          DateTime.tryParse(json['expires_at'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  Map<String, Object?> toJson() {
    return {
      'email': email,
      'token': token,
      'expires_at': expiresAt.toIso8601String(),
    };
  }
}

class ResidentOtpChallenge {
  const ResidentOtpChallenge({
    required this.message,
    required this.expiresAt,
    this.devOtp,
  });

  final String message;
  final DateTime expiresAt;
  final String? devOtp;

  factory ResidentOtpChallenge.fromJson(Map<String, Object?> json) {
    return ResidentOtpChallenge(
      message: json['message'] as String? ?? 'Kode OTP telah dikirim.',
      expiresAt:
          DateTime.tryParse(json['expires_at'] as String? ?? '') ??
          DateTime.now(),
      devOtp: json['dev_otp'] as String?,
    );
  }
}

class ResidentRequestItem {
  const ResidentRequestItem({
    required this.id,
    required this.referenceCode,
    required this.letterType,
    required this.status,
    required this.statusLabel,
    required this.createdAt,
    required this.updatedAt,
    this.applicantName = '',
    this.applicantEmail = '',
    this.applicantPhone,
    this.keperluan,
    this.subjectData = const {},
    this.attachments = const [],
    this.generatedPdfUrl,
    this.decisionReason,
  });

  final String id;
  final String referenceCode;
  final String letterType;
  final String status;
  final String statusLabel;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String applicantName;
  final String applicantEmail;
  final String? applicantPhone;
  final String? keperluan;
  final Map<String, Object?> subjectData;
  final List<Attachment> attachments;
  final String? generatedPdfUrl;
  final String? decisionReason;

  factory ResidentRequestItem.fromJson(Map<String, Object?> json) {
    return ResidentRequestItem(
      id: json['id'] as String? ?? '',
      referenceCode: json['reference_code'] as String? ?? '',
      letterType: json['letter_type'] as String? ?? '',
      status: json['status'] as String? ?? '',
      statusLabel: json['status_label'] as String? ?? '',
      applicantName: json['applicant_name'] as String? ?? '',
      applicantEmail: json['applicant_email'] as String? ?? '',
      applicantPhone: json['applicant_phone'] as String?,
      keperluan: json['keperluan'] as String?,
      subjectData: _objectMap(json['subject_data']),
      attachments: _attachments(json['attachments']),
      createdAt:
          DateTime.tryParse(json['created_at'] as String? ?? '') ??
          DateTime.now(),
      updatedAt:
          DateTime.tryParse(json['updated_at'] as String? ?? '') ??
          DateTime.now(),
      generatedPdfUrl: json['generated_pdf_url'] as String?,
      decisionReason: json['decision_reason'] as String?,
    );
  }
}

Map<String, Object?> _objectMap(Object? value) {
  if (value is Map<String, Object?>) return value;
  if (value is Map) return Map<String, Object?>.from(value);
  return const {};
}

List<Attachment> _attachments(Object? value) {
  if (value is! List) return const [];
  return value
      .whereType<Map>()
      .map((item) => Attachment.fromJson(Map<String, Object?>.from(item)))
      .toList();
}

class ResidentFeedbackItem {
  const ResidentFeedbackItem({
    required this.id,
    required this.referenceCode,
    required this.name,
    required this.email,
    required this.body,
    required this.status,
    required this.createdAt,
    this.phone,
    this.reply,
    this.repliedAt,
    this.attachments = const [],
  });

  final String id;
  final String referenceCode;
  final String name;
  final String email;
  final String? phone;
  final String body;
  final String status;
  final DateTime createdAt;
  final String? reply;
  final DateTime? repliedAt;
  final List<ResidentFeedbackAttachment> attachments;

  factory ResidentFeedbackItem.fromJson(Map<String, Object?> json) {
    return ResidentFeedbackItem(
      id: json['id'] as String? ?? '',
      referenceCode: json['reference_code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      body: json['body'] as String? ?? '',
      status: json['status'] as String? ?? 'new',
      createdAt:
          DateTime.tryParse(json['created_at'] as String? ?? '') ??
          DateTime.now(),
      reply: json['reply'] as String?,
      repliedAt: DateTime.tryParse(json['replied_at'] as String? ?? ''),
      attachments: _feedbackAttachments(json['attachments']),
    );
  }
}

class ResidentFeedbackAttachment {
  const ResidentFeedbackAttachment({
    required this.fileId,
    required this.kind,
    required this.mime,
    required this.size,
    required this.url,
    this.originalName,
  });

  final String fileId;
  final String kind;
  final String mime;
  final int size;
  final String url;
  final String? originalName;

  factory ResidentFeedbackAttachment.fromJson(Map<String, Object?> json) {
    return ResidentFeedbackAttachment(
      fileId: json['file_id'] as String? ?? '',
      kind: json['kind'] as String? ?? '',
      mime: json['mime'] as String? ?? '',
      size: json['size'] as int? ?? 0,
      url: json['url'] as String? ?? '',
      originalName: json['original_name'] as String?,
    );
  }
}

List<ResidentFeedbackAttachment> _feedbackAttachments(Object? value) {
  if (value is! List) return const [];
  return value
      .whereType<Map>()
      .map(
        (item) => ResidentFeedbackAttachment.fromJson(
          Map<String, Object?>.from(item),
        ),
      )
      .toList();
}
