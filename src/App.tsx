import React, { Component, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import { ConsentBar } from "@/components/shared/ConsentBar";
import { PwaStatus } from "@/components/pwa/PwaStatus";
import { ThemeProvider } from "@/components/ThemeProvider";

// Lazy load public pages
const Index = React.lazy(() => import("./pages/Index"));
const Demutran = React.lazy(() => import("./pages/Demutran"));
const GuardaMunicipal = React.lazy(() => import("./pages/GuardaMunicipal"));
const JovemGuarda = React.lazy(() => import("./pages/JovemGuarda"));
const GuardaCidada = React.lazy(() => import("./pages/GuardaCidada"));
const Rope = React.lazy(() => import("./pages/Rope"));
const Gmam = React.lazy(() => import("./pages/Gmam"));
const Gsu = React.lazy(() => import("./pages/Gsu"));
const Noticias = React.lazy(() => import("./pages/Noticias"));
const NoticiaDetalhe = React.lazy(() => import("./pages/NoticiaDetalhe"));
const Contato = React.lazy(() => import("./pages/Contato"));
const DefesaCivil = React.lazy(() => import("./pages/DefesaCivil"));
const Eventos = React.lazy(() => import("./pages/Eventos"));
const PublicConsultaVeiculo = React.lazy(() => import("./pages/PublicConsultaVeiculo"));
const PublicCredencialDemutran = React.lazy(() => import("./pages/PublicCredencialDemutran"));
const PublicConcessionarioDemutran = React.lazy(() => import("./pages/PublicConcessionarioDemutran"));
const PublicRecursoDemutran = React.lazy(() => import("./pages/PublicRecursoDemutran"));
const PublicDocumentosDemutran = React.lazy(() => import("./pages/PublicDocumentosDemutran"));
const PublicMidiasDemutran = React.lazy(() => import("./pages/PublicMidiasDemutran"));
const FalaCidadaoNovaSolicitacao = React.lazy(() => import("./pages/FalaCidadaoNovaSolicitacao"));
const FalaCidadaoAcompanhar = React.lazy(() => import("./pages/FalaCidadaoAcompanhar"));
const FalaCidadaoMinhasSolicitacoes = React.lazy(() => import("./pages/FalaCidadaoMinhasSolicitacoes"));
const TermosDeUso = React.lazy(() => import("./pages/TermosDeUso"));
const PoliticaDePrivacidade = React.lazy(() => import("./pages/PoliticaDePrivacidade"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

// Lazy load admin pages
const Login = React.lazy(() => import("./pages/admin/Login"));
const Dashboard = React.lazy(() => import("./pages/admin/Dashboard"));
const AdminNoticias = React.lazy(() => import("./pages/admin/Noticias"));
const AdminEventos = React.lazy(() => import("./pages/admin/Eventos"));
const AdminProjetos = React.lazy(() => import("./pages/admin/Projetos"));
const AdminGaleria = React.lazy(() => import("./pages/admin/Galeria"));
const AdminEquipe = React.lazy(() => import("./pages/admin/Equipe"));
const AdminContatos = React.lazy(() => import("./pages/admin/Contatos"));
const AdminBanners = React.lazy(() => import("./pages/admin/Banners"));
const AdminDocumentos = React.lazy(() => import("./pages/admin/Documentos"));
const AdminSetores = React.lazy(() => import("./pages/admin/Setores"));
const AdminGestores = React.lazy(() => import("./pages/admin/Gestores"));
const AdminUsuarios = React.lazy(() => import("./pages/admin/Usuarios"));
const AdminDemutranLiberacao = React.lazy(() => import("./pages/admin/DemutranLiberacao"));
const AdminDemutranConcessionarios = React.lazy(() => import("./pages/admin/DemutranConcessionarios"));
const AdminDemutranVeiculosMunicipais = React.lazy(() => import("./pages/admin/DemutranVeiculosMunicipais"));
const AdminDemutranCredenciais = React.lazy(() => import("./pages/admin/DemutranCredenciais"));
const AdminDemutranRecursos = React.lazy(() => import("./pages/admin/DemutranRecursos"));
const AdminDemutranMidias = React.lazy(() => import("./pages/admin/DemutranMidias"));
const AdminMidias = React.lazy(() => import("./pages/admin/MidiasPage"));
const AdminDemutranConteudos = React.lazy(() => import("./pages/admin/DemutranConteudos"));
const AdminProfile = React.lazy(() => import("./pages/admin/Profile"));
const AdminConfiguracoes = React.lazy(() => import("./pages/admin/Configuracoes"));
const AdminGuardasMunicipais = React.lazy(() => import("./pages/admin/GuardasMunicipais"));
const AdminGuardaMunicipalIros = React.lazy(() => import("./pages/admin/GuardaMunicipalIros"));
const AdminConfiguracoesGuarda = React.lazy(() => import("./pages/admin/ConfiguracoesGuarda"));
const GuardaDashboard = React.lazy(() => import("./pages/admin/guarda/Dashboard"));
const GuardaIros = React.lazy(() => import("./pages/admin/guarda/Iros"));
const GuardaIrosHistorico = React.lazy(() => import("./pages/admin/guarda/IrosHistorico"));
const GuardaPerfil = React.lazy(() => import("./pages/admin/guarda/Perfil"));
const GuardaCadastro = React.lazy(() => import("./pages/guardas/Cadastro"));
const AdminFalaCidadao = React.lazy(() => import("./pages/admin/FalaCidadao"));
const AdminRelatorios = React.lazy(() => import("./pages/admin/Relatorios"));
const AdminMinhasAnotacoes = React.lazy(() => import("./pages/admin/MinhasAnotacoes"));
const GuardaMinhasAnotacoes = React.lazy(() => import("./pages/admin/guarda/MinhasAnotacoes"));

const queryClient = new QueryClient();

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasDomMismatch: boolean;
  retryKey: number;
};

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasDomMismatch: false,
    retryKey: 0,
  };

  static getDerivedStateFromError(error: unknown): Partial<AppErrorBoundaryState> | null {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("Failed to execute 'removeChild' on 'Node'")) {
      return { hasDomMismatch: true };
    }

    return null;
  }

  componentDidCatch(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes("Failed to execute 'removeChild' on 'Node'")) {
      window.setTimeout(() => {
        throw error instanceof Error ? error : new Error(String(error));
      }, 0);
      return;
    }

    window.setTimeout(() => {
      this.setState((current) => ({
        hasDomMismatch: false,
        retryKey: current.retryKey + 1,
      }));
    }, 0);
  }

  render() {
    const { children } = this.props;
    const { hasDomMismatch, retryKey } = this.state;

    if (hasDomMismatch) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Reorganizando a interface...</p>
          </div>
        </div>
      );
    }

    return <React.Fragment key={retryKey}>{children}</React.Fragment>;
  }
}

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>}>
    <div data-suspense-wrapper="route">
      {children}
    </div>
  </Suspense>
);

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PwaStatus />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              <SuspenseWrapper>
                <Index />
              </SuspenseWrapper>
            } />
            <Route path="/secretaria" element={<Navigate to="/#secretaria" replace />} />
            <Route path="/demutran" element={
              <SuspenseWrapper>
                <Demutran />
              </SuspenseWrapper>
            } />
            <Route path="/demutran/apreensoes" element={
              <SuspenseWrapper>
                <PublicConsultaVeiculo />
              </SuspenseWrapper>
            } />
            <Route path="/demutran/credenciais" element={
              <SuspenseWrapper>
                <PublicCredencialDemutran />
              </SuspenseWrapper>
            } />
            <Route path="/demutran/concessionario" element={
              <SuspenseWrapper>
                <PublicConcessionarioDemutran />
              </SuspenseWrapper>
            } />
            <Route path="/demutran/concessionario/area" element={
              <SuspenseWrapper>
                <PublicConcessionarioDemutran />
              </SuspenseWrapper>
            } />
            <Route path="/demutran/recursos" element={
              <SuspenseWrapper>
                <PublicRecursoDemutran />
              </SuspenseWrapper>
            } />
            <Route path="/demutran/documentos" element={
              <SuspenseWrapper>
                <PublicDocumentosDemutran />
              </SuspenseWrapper>
            } />
            <Route path="/demutran/midias" element={
              <SuspenseWrapper>
                <PublicMidiasDemutran />
              </SuspenseWrapper>
            } />
            <Route path="/fala-cidadao" element={<Navigate to="/fala-cidadao/nova-solicitacao" replace />} />
            <Route path="/fala-cidadao/nova-solicitacao" element={
              <SuspenseWrapper>
                <FalaCidadaoNovaSolicitacao />
              </SuspenseWrapper>
            } />
            <Route path="/fala-cidadao/acompanhar" element={
              <SuspenseWrapper>
                <FalaCidadaoAcompanhar />
              </SuspenseWrapper>
            } />
            <Route path="/fala-cidadao/minhas-solicitacoes" element={
              <SuspenseWrapper>
                <FalaCidadaoMinhasSolicitacoes />
              </SuspenseWrapper>
            } />
            <Route path="/demutran/educacao" element={<Navigate to="/demutran/midias" replace />} />
            <Route path="/guarda-municipal" element={
              <SuspenseWrapper>
                <GuardaMunicipal />
              </SuspenseWrapper>
            } />
            <Route path="/jovem-guarda" element={
              <SuspenseWrapper>
                <JovemGuarda />
              </SuspenseWrapper>
            } />
            <Route path="/guarda-cidada" element={
              <SuspenseWrapper>
                <GuardaCidada />
              </SuspenseWrapper>
            } />
            <Route path="/rope" element={
              <SuspenseWrapper>
                <Rope />
              </SuspenseWrapper>
            } />
            <Route path="/gmam" element={
              <SuspenseWrapper>
                <Gmam />
              </SuspenseWrapper>
            } />
            <Route path="/gsu" element={
              <SuspenseWrapper>
                <Gsu />
              </SuspenseWrapper>
            } />
            <Route path="/noticias" element={
              <SuspenseWrapper>
                <Noticias />
              </SuspenseWrapper>
            } />
            <Route path="/noticias/:id" element={
              <SuspenseWrapper>
                <NoticiaDetalhe />
              </SuspenseWrapper>
            } />
            <Route path="/contato" element={
              <SuspenseWrapper>
                <Contato />
              </SuspenseWrapper>
            } />
            <Route path="/defesa-civil" element={
              <SuspenseWrapper>
                <DefesaCivil />
              </SuspenseWrapper>
            } />
            <Route path="/eventos" element={
              <SuspenseWrapper>
                <Eventos />
              </SuspenseWrapper>
            } />
            <Route path="/termos-de-uso" element={
              <SuspenseWrapper>
                <TermosDeUso />
              </SuspenseWrapper>
            } />
            <Route path="/politica-de-privacidade" element={
              <SuspenseWrapper>
                <PoliticaDePrivacidade />
              </SuspenseWrapper>
            } />

            {/* Guarda Self-Registration */}
            <Route path="/guardas/cadastro" element={
              <SuspenseWrapper>
                <GuardaCadastro />
              </SuspenseWrapper>
            } />

            {/* Admin Routes */}
            <Route path="/admin/login" element={
              <SuspenseWrapper>
                <Login />
              </SuspenseWrapper>
            } />
            <Route path="/admin/dashboard" element={
              <SuspenseWrapper>
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/dashboard/:setorSlug" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor', 'tecnico']}>
                  <Dashboard />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/perfil" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor', 'tecnico']}>
                  <AdminProfile />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/perfil/:setorSlug" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor', 'tecnico']}>
                  <AdminProfile />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/anotacoes" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor', 'tecnico']}>
                  <AdminMinhasAnotacoes />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/minhas-anotacoes" element={<Navigate to="/admin/anotacoes" replace />} />
            <Route path="/admin/anotacoes/:setorSlug" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor', 'tecnico']}>
                  <AdminMinhasAnotacoes />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/minhas-anotacoes/:setorSlug" element={<Navigate to="/admin/anotacoes" replace />} />
            <Route path="/admin/configuracoes-demutran" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['gestor']} requiredSetorSlug="demutran">
                  <AdminConfiguracoes />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/setores" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin']}>
                  <AdminSetores />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/gestores" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin']}>
                  <AdminGestores />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/usuarios" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor']}>
                  <AdminUsuarios />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/usuarios/:setorSlug" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor']}>
                  <AdminUsuarios />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/guardas-municipais" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin']} allowSuperAdmin={false}>
                  <AdminGuardasMunicipais />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/fala-cidadao" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor', 'tecnico']}>
                  <AdminFalaCidadao />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/fala-cidadao/:setorSlug" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor', 'tecnico']}>
                  <AdminFalaCidadao />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/relatorios" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin']}>
                  <AdminRelatorios />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/liberacao" element={<Navigate to="/admin/demutran/veiculos" replace />} />
            <Route path="/admin/demutran/dashboard" element={<Navigate to="/admin/dashboard/demutran" replace />} />
            <Route path="/admin/demutran/documentos" element={<Navigate to="/admin/documentos/demutran" replace />} />
            <Route path="/admin/demutran/usuarios" element={<Navigate to="/admin/usuarios/demutran" replace />} />
            <Route path="/admin/demutran/banners" element={<Navigate to="/admin/banners" replace />} />
            <Route path="/admin/midias" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} allowSuperAdmin={false}>
                  <AdminMidias />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/midias/:setorSlug" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} allowSuperAdmin={false}>
                  <AdminMidias />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/documentos/:setorSlug" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} allowSuperAdmin={false}>
                  <AdminDocumentos />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/equipe/:setorSlug" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']}>
                  <AdminEquipe />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/midias" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran" allowSuperAdmin={false}>
                  <AdminMidias />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/midias/banners" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran" allowSuperAdmin={false}>
                  <AdminBanners />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/veiculos" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran" allowSuperAdmin={false}>
                  <AdminDemutranLiberacao />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/concessionarios" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran" allowSuperAdmin={false}>
                  <AdminDemutranConcessionarios />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/frota" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran" allowSuperAdmin={false}>
                  <AdminDemutranVeiculosMunicipais />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/credenciais" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran" allowSuperAdmin={false}>
                  <AdminDemutranCredenciais />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/recursos" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran" allowSuperAdmin={false}>
                  <AdminDemutranRecursos />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/midias/conteudos" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran" allowSuperAdmin={false}>
                  <AdminDemutranConteudos />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/guarda-municipal/iros" element={<Navigate to="/admin/iros/guarda-municipal" replace />} />
            <Route path="/admin/guarda-municipal/guardas" element={<Navigate to="/admin/guardas/guarda-municipal" replace />} />
            <Route path="/admin/iros/guarda-municipal/*" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['gestor', 'admin_setor', 'tecnico']} requiredSetorSlug="guarda-municipal">
                  <AdminGuardaMunicipalIros />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/guardas/guarda-municipal" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor', 'tecnico']} requiredSetorSlug="guarda-municipal">
                  <AdminGuardasMunicipais />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/configuracoes-guarda-municipal" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="guarda-municipal">
                  <AdminConfiguracoesGuarda />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/noticias" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']}>
                  <AdminNoticias />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/eventos" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']}>
                  <AdminEventos />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/projetos" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin']}>
                  <AdminProjetos />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/galeria" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']}>
                  <AdminGaleria />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/documentos" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} allowSuperAdmin={false}>
                  <AdminDocumentos />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/banners" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin']}>
                  <AdminBanners />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/equipe" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']}>
                  <AdminEquipe />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/contatos" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin']}>
                  <AdminContatos />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />

            {/* Guarda Municipal - Perfil Routes */}
            <Route path="/admin/perfil-guardas/guarda-municipal/dashboard" element={
              <SuspenseWrapper>
                <ProtectedRoute requireGuarda>
                  <GuardaDashboard />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/perfil-guardas/guarda-municipal/iros" element={
              <SuspenseWrapper>
                <ProtectedRoute requireGuarda>
                  <GuardaIros />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/perfil-guardas/guarda-municipal/iros/historico" element={
              <SuspenseWrapper>
                <ProtectedRoute requireGuarda>
                  <GuardaIrosHistorico />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/perfil-guardas/guarda-municipal/perfil" element={
              <SuspenseWrapper>
                <ProtectedRoute requireGuarda>
                  <GuardaPerfil />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/perfil-guardas/guarda-municipal/anotacoes" element={
              <SuspenseWrapper>
                <ProtectedRoute requireGuarda>
                  <GuardaMinhasAnotacoes />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={
              <SuspenseWrapper>
                <NotFound />
              </SuspenseWrapper>
            } />
              </Routes>
              <ConsentBar />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
