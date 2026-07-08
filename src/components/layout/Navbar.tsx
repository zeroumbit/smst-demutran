import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Shield, ChevronDown, ChevronRight } from "lucide-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<string[]>([]);
  const location = useLocation();

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === "/fala-cidadao/nova-solicitacao" && location.pathname.startsWith("/fala-cidadao"));

  const navItems = [
    { label: "Início", path: "/" },
    { label: "Demutran", path: "/demutran", newTab: true },
    { label: "Fala Cidadão", path: "/fala-cidadao/nova-solicitacao" },
    { label: "Guarda Municipal", path: "/guarda-municipal" },
    {
      label: "Projetos",
      submenu: [
        { label: "Defesa Civil", path: "/defesa-civil" },
        { label: "Guarda Cidadã", path: "/guarda-cidada" },
        { label: "Jovem Guarda Cidadã", path: "/jovem-guarda" },
        { label: "ROPE", path: "/rope" },
        { label: "GMAM", path: "/gmam" },
        { label: "GSU", path: "/gsu" },
      ]
    },
    { label: "Notícias", path: "/noticias" },
    { label: "Eventos", path: "/eventos" },
    { label: "Contato", path: "/contato" },
    { label: "Entrar", path: "/admin/login" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-secondary shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 pr-16 group">
            <div className="bg-white p-2 rounded-lg transition-transform duration-300 group-hover:scale-110">
              <img
                src="https://jpztntmwmrhdobxsyulj.supabase.co/storage/v1/object/public/imagens/logo.png"
                alt="Logo SMST"
                className="h-8 w-8 object-contain"
              />
            </div>
            <div className="md:hidden">
              <h1 className="text-secondary-foreground font-bold text-lg leading-tight">
                SMST
              </h1>
            </div>
            <div className="hidden md:block">
              <h1 className="text-secondary-foreground font-bold text-lg leading-tight">
                SMST
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center justify-between flex-1">
            <div className="flex items-center gap-1">
              {navItems.slice(0, -1).map((item) => (
                item.submenu ? (
                  <div key={item.label} className="relative group">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-secondary-foreground hover:bg-yellow-300 flex items-center gap-1"
                    >
                      {item.label}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <div className="absolute top-full left-0 mt-1 bg-primary shadow-lg rounded-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[200px]">
                      {item.submenu.map((subItem) => (
                        <Link key={subItem.path} to={subItem.path}>
                          <Button
                            variant={isActive(subItem.path) ? "secondary" : "ghost"}
                            size="sm"
              className={`w-full justify-start rounded-none ${isActive(subItem.path) ? "" : "text-white hover:bg-yellow-300 hover:text-blue-600"
                }`}
                          >
                            {subItem.label}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  item.newTab ? (
                    <a key={item.path} href={item.path} target="_blank" rel="noopener noreferrer">
                      <Button
                        variant={isActive(item.path) ? "secondary" : "ghost"}
                        size="sm"
                        className={isActive(item.path) ? "" : "text-secondary-foreground hover:bg-yellow-300"}
                      >
                        {item.label}
                      </Button>
                    </a>
                  ) : (
                    <Link key={item.path} to={item.path}>
                      <Button
                        variant={isActive(item.path) ? "secondary" : "ghost"}
                        size="sm"
                        className={isActive(item.path) ? "" : "text-secondary-foreground hover:bg-yellow-300"}
                      >
                        {item.label}
                      </Button>
                    </Link>
                  )
                )
              ))}
            </div>

            {/* Login button on the right */}
            <a href={navItems[navItems.length - 1].path} target="_blank" rel="noopener noreferrer">
              <Button
                variant={isActive(navItems[navItems.length - 1].path) ? "secondary" : "ghost"}
                size="sm"
                className={isActive(navItems[navItems.length - 1].path) ? "" : "text-secondary-foreground hover:bg-yellow-300"}
              >
                {navItems[navItems.length - 1].label}
              </Button>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden text-secondary-foreground p-2"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation - Fullscreen Overlay */}
        {isMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[60] bg-secondary animate-fade-in">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-yellow-400">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg">
                  <img
                    src="https://jpztntmwmrhdobxsyulj.supabase.co/storage/v1/object/public/imagens/logo.png"
                    alt="Logo SMST"
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <h1 className="text-secondary-foreground font-bold text-lg">SMST</h1>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="text-secondary-foreground p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex flex-col gap-2 p-4 sm:p-6 overflow-y-auto h-[calc(100vh-4rem)]">
              {navItems.map((item) =>
                item.label === "Entrar" ? (
                  <a
                    key={item.path}
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block pt-4"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button className="w-full bg-white text-blue-700 font-bold hover:bg-gray-100 shadow-md">
                      {item.label}
                    </Button>
                  </a>
                ) : item.submenu ? (
                  <div key={item.label} className="space-y-1">
                    <button
                      onClick={() => toggleSubmenu(item.label)}
                      className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-secondary-foreground hover:text-yellow-300 transition-colors rounded-lg"
                    >
                      {item.label}
                      {openSubmenus.includes(item.label) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {openSubmenus.includes(item.label) && (
                      <div className="space-y-1 animate-fade-in ml-2 border-l-2 border-yellow-400/30 pl-4">
                        {item.submenu.map((subItem) => (
                          <Link key={subItem.path} to={subItem.path} onClick={() => setIsMenuOpen(false)}>
                            <Button
                              variant={isActive(subItem.path) ? "secondary" : "ghost"}
                              className={`w-full justify-start ${isActive(subItem.path) ? "" : "text-secondary-foreground hover:bg-yellow-300"
                                }`}
                            >
                              {subItem.label}
                            </Button>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : item.newTab ? (
                  <a key={item.path} href={item.path} target="_blank" rel="noopener noreferrer" className="block">
                    <Button
                      variant={isActive(item.path) ? "secondary" : "ghost"}
                      className={`w-full justify-start ${isActive(item.path) ? "" : "text-secondary-foreground hover:bg-yellow-300"
                        }`}
                    >
                      {item.label}
                    </Button>
                  </a>
                ) : (
                  <Link key={item.path} to={item.path} onClick={() => setIsMenuOpen(false)} className="block">
                    <Button
                      variant={isActive(item.path) ? "secondary" : "ghost"}
                      className={`w-full justify-start ${isActive(item.path) ? "" : "text-secondary-foreground hover:bg-yellow-300"
                        }`}
                    >
                      {item.label}
                    </Button>
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
