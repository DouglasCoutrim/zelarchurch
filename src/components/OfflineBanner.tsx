import { useEffect, useState } from "react";
import { WifiOff, X } from "lucide-react";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const on = () => {
      setIsOnline(true);
      setDismissed(false);
    };
    const off = () => {
      setIsOnline(false);
      setDismissed(false);
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (isOnline || dismissed) return null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 bg-gold px-5 py-2.5 text-sm font-medium text-white animate-fade-in">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>Você está offline. Algumas funcionalidades podem estar limitadas.</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="rounded p-1 transition-colors hover:bg-white/20"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
