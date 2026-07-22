import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogIn, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Footer from "@/components/layout/Footer";

const mainItems = [
  { label: "Home", href: "/demutran" },
  { label: "Fala Cidadão", href: "/fala-cidadao/nova-solicitacao" },
  { label: "Concessionario", href: "/demutran/concessionario" },
  { label: "Credenciais", href: "/demutran/credenciais" },
  { label: "Recursos", href: "/demutran/recursos" },
  { label: "Apreensoes", href: "/demutran/apreensoes" },
  { label: "Documentos", href: "/demutran/documentos" },
  { label: "Midias", href: "/demutran/midias" },
];

const utilityItems = [
  { label: "Login", href: "/admin/login", external: true },
];

function isCurrent(pathname: string, href: string) {
  return (
    pathname === href ||
    (href === '/demutran/concessionario' && pathname.startsWith('/demutran/concessionario')) ||
    (href === '/fala-cidadao/nova-solicitacao' && pathname.startsWith('/fala-cidadao'))
  );
}

function DemutranPortalNav() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-secondary-foreground/10 bg-secondary pt-[var(--safe-area-top)] text-secondary-foreground backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/demutran" className="flex items-center gap-3">
          <img src="/images/demutran.png" alt="DEMUTRAN" className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {mainItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`px-3 py-2 text-sm font-semibold transition ${
                isCurrent(location.pathname, item.href)
                  ? "text-secondary-foreground"
                  : "text-secondary-foreground/75 hover:text-secondary-foreground"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="/admin/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
          >
            <LogIn className="h-4 w-4" />
            Login
          </a>
        </div>

        <Sheet>
          <SheetTrigger className="inline-flex items-center justify-center rounded-full border border-secondary-foreground/20 p-3 lg:hidden">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-full border-slate-800 bg-slate-950 text-white sm:w-3/4 sm:max-w-sm">
            <SheetTitle className="text-left text-white">Portal DEMUTRAN</SheetTitle>
            <div className="mt-8 space-y-3">
              {mainItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="mt-8 border-t border-white/10 pt-6">
              <div className="space-y-3">
                {utilityItems.map((item) =>
                  item.external ? (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-2xl bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <a
                      key={item.href}
                      href={item.href}
                      className="block rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                    >
                      {item.label}
                    </a>
                  )
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function DemutranPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <DemutranPortalNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
