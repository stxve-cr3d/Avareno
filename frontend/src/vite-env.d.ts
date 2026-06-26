/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN?: string;
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
