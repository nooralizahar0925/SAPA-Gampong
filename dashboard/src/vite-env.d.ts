/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_STAGING_APP_INSTALL?: string;
  readonly VITE_STAGING_ANDROID_APK_URL?: string;
  readonly VITE_STAGING_ANDROID_APK_METADATA_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
