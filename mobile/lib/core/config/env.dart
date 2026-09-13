class Env {
  const Env._();

  static const appEnvironment = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'production',
  );

  static const isStaging = appEnvironment == 'staging';

  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8081/api',
  );

  static const privacyPolicyUrl = String.fromEnvironment(
    'PRIVACY_POLICY_URL',
    defaultValue: 'https://gampongblangdigital.com/privacy-policy',
  );
}
