/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_CLOUD_SECURITY_MODE?: 'strict' | 'compat';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
