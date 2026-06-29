import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import { ConsentBar } from "@/components/shared/ConsentBar";
import { ThemeProvider } from "next-themes";

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
const AdminFalaCidadao = React.lazy(() => import("./pages/admin/FalaCidadao"));

const queryClient = new QueryClient();

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>}>
    {children}
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
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
            <Route path="/admin/perfil" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor', 'tecnico']}>
                  <AdminProfile />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/configuracoes" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor']} requiredSetorSlug="demutran">
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
            <Route path="/admin/guardas-municipais" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin']}>
                  <AdminGuardasMunicipais />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/fala-cidadao" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor', 'tecnico']} requiredSetorSlug="fala-cidadao">
                  <AdminFalaCidadao />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/liberacao" element={<Navigate to="/admin/demutran/veiculos" replace />} />
            <Route path="/admin/demutran/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/demutran/documentos" element={<Navigate to="/admin/documentos" replace />} />
            <Route path="/admin/demutran/usuarios" element={<Navigate to="/admin/usuarios" replace />} />
            <Route path="/admin/demutran/banners" element={<Navigate to="/admin/banners" replace />} />
            <Route path="/admin/midias" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']}>
                  <AdminMidias />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/midias" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran">
                  <AdminMidias />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/midias/banners" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran">
                  <AdminBanners />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/veiculos" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran">
                  <AdminDemutranLiberacao />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/concessionarios" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran">
                  <AdminDemutranConcessionarios />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/frota" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran">
                  <AdminDemutranVeiculosMunicipais />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/credenciais" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran">
                  <AdminDemutranCredenciais />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/recursos" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran">
                  <AdminDemutranRecursos />
                </ProtectedRoute>
              </SuspenseWrapper>
            } />
            <Route path="/admin/demutran/midias/conteudos" element={
              <SuspenseWrapper>
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']} requiredSetorSlug="demutran">
                  <AdminDemutranConteudos />
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
                <ProtectedRoute allowedPapeis={['super_admin', 'gestor', 'admin_setor']}>
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
);

export default App;
