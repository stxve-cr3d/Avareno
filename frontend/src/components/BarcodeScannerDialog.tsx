import { useEffect, useRef, useState } from "react";
import { Camera, ScanBarcode, X } from "lucide-react";

const preferredFormats: BarcodeDetectorFormat[] = ["qr_code", "ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"];

type Props = {
  onClose: () => void;
  onDetected: (value: string) => void;
  open: boolean;
};

export function BarcodeScannerDialog({ onClose, onDetected, open }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [message, setMessage] = useState("Kamera startet...");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    const stop = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    async function startScanner() {
      setError("");
      setMessage("Kamera startet...");

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Dein Browser kann die Kamera hier nicht öffnen. Füge den Barcode stattdessen manuell ein.");
        setMessage("Manuelle Eingabe verfügbar");
        return;
      }

      const BarcodeDetectorConstructor = window.BarcodeDetector;
      if (!BarcodeDetectorConstructor) {
        setError("Automatisches Barcode-Scannen wird in diesem Browser noch nicht unterstützt. Füge den Barcode stattdessen manuell ein.");
        setMessage("Manuelle Eingabe verfügbar");
        return;
      }

      try {
        const supported = await BarcodeDetectorConstructor.getSupportedFormats().catch(() => preferredFormats);
        const formats = preferredFormats.filter((format) => supported.includes(format));
        const detector = new BarcodeDetectorConstructor({ formats: formats.length ? formats : preferredFormats });
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            height: { ideal: 720 },
            width: { ideal: 1280 }
          }
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setMessage("Halte QR-Code oder Barcode in den Rahmen");

        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const results = await detector.detect(videoRef.current);
              const rawValue = results[0]?.rawValue?.trim();
              if (rawValue) {
                stop();
                onDetected(rawValue);
                return;
              }
            }
          } catch {
            // Some browsers throw while the first frames settle; the next animation frame usually succeeds.
          }
          frameRef.current = requestAnimationFrame(scan);
        };

        frameRef.current = requestAnimationFrame(scan);
      } catch (caught) {
        const detail = caught instanceof Error && caught.name === "NotAllowedError" ? "Die Kamerafreigabe wurde abgelehnt." : "Die Kamera konnte nicht gestartet werden.";
        setError(`${detail} Füge den Barcode stattdessen manuell ein.`);
        setMessage("Manuelle Eingabe verfügbar");
        stop();
      }
    }

    void startScanner();
    return () => {
      cancelled = true;
      stop();
    };
  }, [onDetected, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="mx-auto mt-8 max-w-lg overflow-hidden rounded-lg border border-white/12 bg-[#101111] text-white shadow-[0_32px_100px_rgba(0,0,0,0.42)] md:mt-20" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 p-4">
          <div>
            <p className="text-xs font-bold uppercase text-white/50">Barcode-Scan</p>
            <h2 className="mt-1 text-2xl font-semibold">Produkt finden</h2>
          </div>
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white/75 transition hover:bg-white/16 hover:text-white" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="relative mx-4 overflow-hidden rounded-lg border border-white/14 bg-black">
          <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-32 w-[78%] rounded-lg border border-white/70 shadow-[0_0_0_999px_rgba(0,0,0,0.24)]" />
          </div>
          <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-xs font-semibold text-white/82">
            <Camera size={14} />
            Live-Kamera
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/8 p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md av-surface text-ink">
              <ScanBarcode size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold">{message}</p>
              <p className="mt-1 text-sm font-medium leading-6 text-white/58">
                QR-, EAN-, UPC- und GTIN-Codes werden unterstützt, wenn dein Browser natives Scannen freigibt.
              </p>
            </div>
          </div>
          {error ? <p className="mt-3 rounded-lg av-surface px-3 py-2 text-sm font-semibold text-ink">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
