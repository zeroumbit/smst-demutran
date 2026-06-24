import { useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { FileText, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "lgpd_consent";

interface TermsGateProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function TermsGate({
  children,
  title = "Aceite os termos para continuar",
  description = "Para utilizar este servico, voce precisa aceitar nossos Termos de Uso e Politica de Privacidade.",
}: TermsGateProps) {
  const [accepted, setAccepted] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "true") {
      setAccepted(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setAccepted(true);
  };

  if (accepted) {
    return <>{children}</>;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-7 w-7 text-primary" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>

        <div className="space-y-3 text-left">
          <div className="rounded-xl border border-border bg-muted/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Documentos
            </p>
            <div className="mt-3 space-y-2">
              <Link
                to="/termos-de-uso"
                target="_blank"
                className="flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <FileText className="h-5 w-5 text-primary" />
                Termos de Uso
              </Link>
              <Link
                to="/politica-de-privacidade"
                target="_blank"
                className="flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <FileText className="h-5 w-5 text-primary" />
                Politica de Privacidade
              </Link>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition hover:bg-muted/50">
            <input
              type="checkbox"
              checked={checkboxChecked}
              onChange={(e) => setCheckboxChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Li e aceito os Termos de Uso e a Politica de Privacidade
              </p>
              <p className="text-xs text-muted-foreground">
                Ao marcar esta opcao, voce declara ter lido e concordar com as condicoes establecidas.
              </p>
            </div>
          </label>
        </div>

        <Button
          onClick={handleAccept}
          disabled={!checkboxChecked}
          className="w-full rounded-full"
          size="lg"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Continuar
        </Button>
      </div>
    </div>
  );
}
