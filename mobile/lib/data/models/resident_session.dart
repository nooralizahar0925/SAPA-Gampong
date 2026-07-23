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
  final String? generatedPdfUrl;
  final String? decisionReason;

  factory ResidentRequestItem.fromJson(Map<String, Object?> json) {
    return ResidentRequestItem(
      id: json['id'] as String? ?? '',
      referenceCode: json['reference_code'] as String? ?? '',
      letterType: json['letter_type'] as String? ?? '',
      status: json['status'] as String? ?? '',
      statusLabel: json['status_label'] as String? ?? '',
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

class ResidentFeedbackItem {
  const ResidentFeedbackItem({
    required this.id,
    required this.referenceCode,
    required this.body,
    required this.status,
    required this.createdAt,
    this.reply,
    this.repliedAt,
  });

  final String id;
  final String referenceCode;
  final String body;
  final String status;
  final DateTime createdAt;
  final String? reply;
  final DateTime? repliedAt;

  factory ResidentFeedbackItem.fromJson(Map<String, Object?> json) {
    return ResidentFeedbackItem(
      id: json['id'] as String? ?? '',
      referenceCode: json['reference_code'] as String? ?? '',
      body: json['body'] as String? ?? '',
      status: json['status'] as String? ?? 'new',
      createdAt:
          DateTime.tryParse(json['created_at'] as String? ?? '') ??
          DateTime.now(),
      reply: json['reply'] as String?,
      repliedAt: DateTime.tryParse(json['replied_at'] as String? ?? ''),
    );
  }
}
