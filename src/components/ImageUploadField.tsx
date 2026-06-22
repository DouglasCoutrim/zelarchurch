import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  label?: string;
  /** Max width/height in px after resize. Default 800. Use 256 for avatars. */
  maxSize?: number;
  /** JPEG quality 0–1. Default 0.82. */
  quality?: number;
  /** Visual style of the preview. */
  shape?: "square" | "circle" | "wide";
  className?: string;
  disabled?: boolean;
};

async function fileToCompressedDataUrl(
  file: File,
  maxSize: number,
  quality: number,
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  // SVG: keep as-is
  if (file.type === "image/svg+xml") return dataUrl;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Falha ao ler a imagem"));
    el.src = dataUrl;
  });

  const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export function ImageUploadField({
  value,
  onChange,
  label,
  maxSize = 800,
  quality = 0.82,
  shape = "square",
  className,
  disabled,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const out = await fileToCompressedDataUrl(file, maxSize, quality);
      onChange(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao processar imagem");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  const shapeClass =
    shape === "circle"
      ? "h-28 w-28 rounded-full"
      : shape === "wide"
        ? "h-32 w-full rounded-md"
        : "h-28 w-28 rounded-md";

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-border bg-muted/40 text-muted-foreground",
            shapeClass,
          )}
        >
          {value ? (
            <img
              src={value}
              alt={label ?? "imagem"}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus className="h-6 w-6 opacity-60" />
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || busy}
          >
            <Upload className="mr-2 h-4 w-4" />
            Selecionar arquivo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraRef.current?.click()}
            disabled={disabled || busy}
            title="Abrir câmera (apenas em dispositivos móveis)"
          >
            <Camera className="mr-2 h-4 w-4" />
            Câmera
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              disabled={disabled || busy}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
