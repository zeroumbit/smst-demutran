import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Instagram, MessageCircle } from "lucide-react";
import zero1bitLogo from "@/ZEROUM.svg";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <><footer className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo e Sobre */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-lg">
                <img
                  src="https://jpztntmwmrhdobxsyulj.supabase.co/storage/v1/object/public/imagens/logo.png"
                  alt="Logo SMST"
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div>
                <h3 className="font-bold text-lg">Secretaria de Segurança</h3>
                <p className="text-sm text-primary-foreground/80">Canindé</p>
              </div>
            </div>
            <p className="text-sm text-primary-foreground/70 mb-3">
              Guardar, servir e proteger.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <a href="tel:153" className="flex items-center gap-2 text-secondary hover:text-secondary/80 transition-colors">
                <Phone className="h-4 w-4" />
                <span className="font-bold">153</span>
                <span className="ml-2 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded">EMERGÊNCIA</span>
              </a>
              <a
                href="https://wa.me/558533430413"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-secondary hover:text-secondary/80 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="font-bold">WhatsApp</span>
                <span className="ml-2 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded">EMERGÊNCIA</span>
              </a>
              <a
                href="https://www.instagram.com/smst.caninde/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-secondary hover:text-secondary/80 transition-colors"
              >
                <Instagram className="h-4 w-4" />
                <span className="font-bold">Instagram</span>
              </a>
            </div>
          </div>

          {/* Links Rápidos */}
          <div>
            <h4 className="font-bold text-lg mb-4">Links Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/secretaria" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  Secretaria de Segurança
                </Link>
              </li>
              <li>
                <a href="/demutran" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  DEMUTRAN
                </a>
              </li>
              <li>
                <Link to="/guarda-municipal" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  Guarda Municipal
                </Link>
              </li>
              <li>
                <Link to="/noticias" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  Notícias
                </Link>
              </li>
            </ul>
          </div>

          {/* Transparência */}
          <div>
            <h4 className="font-bold text-lg mb-4">Transparência</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://www.caninde.ce.gov.br/acessoainformacao.php" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  Portal da Transparência
                </a>
              </li>
              <li>
                <a href="https://www.caninde.ce.gov.br/licitacao.php" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  Licitações
                </a>
              </li>
              <li>
                <a href="https://www.caninde.ce.gov.br/ouvidoria.php" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  Ouvidoria
                </a>
              </li>
              <li>
                <Link to="/termos-de-uso" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/politica-de-privacidade" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-bold text-lg mb-4">Contato</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 text-secondary flex-shrink-0" />
                <span className="text-sm text-primary-foreground/70">
                  Av. Raimundo Alcoforado, 777 – Alto Guaramiranga, Canindé/CE
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-secondary flex-shrink-0" />
                <a href="tel:+558533430413" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  (85) 3343-0413
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-secondary flex-shrink-0" />
                <a href="mailto:smstcaninde@gmail.com" className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors">
                  smstcaninde@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
          <p className="text-sm text-primary-foreground/60">
            © {currentYear} Secretaria de Segurança de Canindé. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
      <div className="relative overflow-hidden bg-slate-950 border-t border-slate-800/80">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary to-transparent" />
        <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-[720px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-5">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <a
              href="https://zero1bit.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur transition-all duration-300 group-hover:ring-white/25 group-hover:bg-white/10">
                <img
                  src={zero1bitLogo}
                  alt="zero1bit"
                  className="h-7 w-7 object-contain transition-transform duration-300 group-hover:scale-110"
                />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-slate-200 transition-colors duration-300 group-hover:text-white">
                  Construído por{" "}
                  <span className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text font-bold text-transparent">
                    zero1bit
                  </span>
                </span>
                <span className="text-xs text-slate-400">
                  Tecnologia para o serviço público
                </span>
              </span>
            </a>
            <a
              href="https://wa.me/5585997277128"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 text-sm text-slate-300 transition-colors duration-300 hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-400/30 transition-all duration-300 group-hover:bg-green-500/20 group-hover:ring-green-400/50">
                <MessageCircle className="h-4 w-4 text-green-400" />
              </span>
              <span>
                Construa seu site{" "}
                <span className="font-semibold text-white">(85) 9 97277128</span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default Footer;
