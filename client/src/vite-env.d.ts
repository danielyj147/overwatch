/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAP_STYLE_URL: string;
  readonly VITE_HOCUSPOCUS_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_MARTIN_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
