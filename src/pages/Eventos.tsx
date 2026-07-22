import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/shared/Hero";
import EventosExibicao from "@/components/shared/EventosExibicao";

const Eventos = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="public-navbar-spacer" />

      <Hero
        title="Eventos"
        subtitle="Próximos Eventos"
        description="Confira os próximos eventos e atividades programadas pela Secretaria de Segurança de Canindé."
      />

      <EventosExibicao paginaAtual="eventos" />

      <Footer />
    </div>
  );
};

export default Eventos;
