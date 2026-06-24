import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "lgpd_consent";

export function useConsent() {
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    setAccepted(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setAccepted(true);
  };

  return { accepted, accept };
}

export function ConsentBar() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) return;
    const hasConsent = localStorage.getItem(STORAGE_KEY) === "true";
    if (!hasConsent) {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setLeaving(true);
    setTimeout(() => setVisible(false), 400);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[100] transition-all duration-400 ${
        leaving ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="border-t border-border bg-background/95 backdrop-blur-lg shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.12)]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-bold text-foreground">Privacidade e Termos</p>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Ao continuar navegando, voce aceita nossos{" "}
                <Link to="/termos-de-uso" className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80">
                  Termos de Uso
                </Link>{" "}
                e{" "}
                <Link to="/politica-de-privacidade" className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80">
                  Politica de Privacidade
                </Link>.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" onClick={handleAccept} className="rounded-full px-6 text-xs font-bold sm:text-sm">
                Aceitar
              </Button>
              <button
                type="button"
                onClick={handleAccept}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
