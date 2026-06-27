/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN?: string;
  readonly VITE_AUTH_PROVIDER?: "supabase" | "mock";
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_AUTH_REDIRECT_URL?: string;
  readonly VITE_AUTH_EMAIL_REDIRECT_URL?: string;
  readonly VITE_AUTH_PASSWORD_RESET_URL?: string;
  readonly VITE_AUTH_GOOGLE_ENABLED?: string;
  readonly VITE_AUTH_APPLE_ENABLED?: string;
  readonly VITE_AUTH_EMAIL_FROM?: string;
  readonly VITE_AUTH_EMAIL_FROM_NAME?: string;
  readonly VITE_AUTH_EMAIL_REPLY_TO?: string;
  readonly VITE_AUTH_SUPPORT_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type BarcodeDetectorFormat = "aztec" | "code_128" | "code_39" | "code_93" | "codabar" | "data_matrix" | "ean_13" | "ean_8" | "itf" | "pdf417" | "qr_code" | "upc_a" | "upc_e";

type DetectedBarcode = {
  boundingBox: DOMRectReadOnly;
  cornerPoints: { x: number; y: number }[];
  format: BarcodeDetectorFormat;
  rawValue: string;
};

type BarcodeDetector = {
  detect: (source: HTMLVideoElement | ImageBitmapSource) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = {
  new (options?: { formats?: BarcodeDetectorFormat[] }): BarcodeDetector;
  getSupportedFormats: () => Promise<BarcodeDetectorFormat[]>;
};

interface Window {
  BarcodeDetector?: BarcodeDetectorConstructor;
}
