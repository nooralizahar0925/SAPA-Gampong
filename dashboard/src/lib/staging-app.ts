export const STAGING_APP_INSTALL_ENABLED = import.meta.env.VITE_ENABLE_STAGING_APP_INSTALL === 'true';

export const STAGING_ANDROID_APK_URL =
  import.meta.env.VITE_STAGING_ANDROID_APK_URL ?? '/mobile-app/latest.apk';

export const STAGING_ANDROID_APK_METADATA_URL =
  import.meta.env.VITE_STAGING_ANDROID_APK_METADATA_URL ?? '/mobile-app/metadata.json';
