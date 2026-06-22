import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, QrCode, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type BarcodeDetectorCtor = new (opts?: { formats: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};

type Props = { onDetected: (code: string) => void };

export function QrScanButton({ onDetected }: Props) {
  const [open, setOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const supported =
    typeof window !== "undefined" && "BarcodeDetector" in window;

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  useEffect(() => {
    if (!open) stopCamera();
    return stopCamera;
  }, [open]);

  function extractCode(raw: string): string | null {
    const trimmed = raw.trim();
    const m = trimmed.match(/\/join\/([A-Za-z0-9-]+)/);
    if (m) return m[1].toUpperCase();
    if (/^ZLR-[A-Z0-9]+$/i.test(trimmed)) return trimmed.toUpperCase();
    return null;
  }

  async function startCamera() {
    setError(null);
    if (!supported) {
      setError("Seu navegador não suporta leitor de QR nativo. Cole o código abaixo.");
      return;
    }
    try {
      setScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const BD = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
      const detector = new BD({ formats: ["qr_code"] });

      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            const value = extractCode(codes[0].rawValue);
            if (value) {
              stopCamera();
              setOpen(false);
              onDetected(value);
              return;
            }
          }
        } catch {
          /* ignore tick errors */
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Câmera indisponível: ${err.message}`
          : "Não foi possível acessar a câmera",
      );
      setScanning(false);
    }
  }

  function submitManual() {
    const value = extractCode(manualCode);
    if (!value) {
      setError("Código inválido. Use o formato ZLR-XXXXXX.");
      return;
    }
    setOpen(false);
    onDetected(value);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <QrCode className="h-4 w-4" />
          Escanear QR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Entrar com QR Code</DialogTitle>
          <DialogDescription>
            Aponte a câmera para o QR code da sua igreja ou cole o código.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-black/80">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${scanning ? "" : "hidden"}`}
            />
            {!scanning && (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-sm text-white/80">
                <Camera className="h-10 w-10" />
                <Button variant="gold" size="sm" onClick={startCamera}>
                  Abrir câmera
                </Button>
                {!supported && (
                  <p className="text-xs text-white/60">
                    Leitor automático indisponível neste navegador.
                  </p>
                )}
              </div>
            )}
            {scanning && (
              <button
                type="button"
                onClick={stopCamera}
                aria-label="Parar"
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {scanning && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-white/80">
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Procurando QR...
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Ou cole o código manualmente</Label>
            <div className="flex gap-2">
              <Input
                placeholder="ZLR-XXXXXX"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="font-mono uppercase"
              />
              <Button onClick={submitManual} disabled={!manualCode}>
                Entrar
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="text-xs text-muted-foreground">
          O acesso só é liberado depois do cadastro.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
