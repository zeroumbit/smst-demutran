import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/shared/Hero";
import { Phone, Mail, MapPin, Clock, Instagram } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Contato = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="public-navbar-spacer" />

      <Hero
        title="Contato"
        subtitle="Fale Conosco"
        description="Entre em contato com a Secretaria de Segurança de Canindé. Estamos aqui para atendê-lo."
      />

      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <Card className="border-2 border-border hover:border-primary transition-all duration-300 bg-gradient-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-primary p-3 rounded-xl">
                      <Phone className="h-6 w-6 text-primary-foreground" />
                    </div>
                    Telefones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-semibold text-foreground">Emergências - Guarda Municipal</p>
                    <a href="tel:153" className="text-primary hover:text-primary-light transition-colors text-lg font-bold">
                      153
                    </a>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Telefone geral</p>
                    <a href="tel:+558533430413" className="text-muted-foreground hover:text-primary transition-colors">
                      (85) 3343-0413
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-border hover:border-primary transition-all duration-300 bg-gradient-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-primary p-3 rounded-xl">
                      <Mail className="h-6 w-6 text-primary-foreground" />
                    </div>
                    E-mails
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-semibold text-foreground">Secretaria de Segurança</p>
                    <a href="mailto:demutran.smstcaninde@gmail.com" className="text-muted-foreground hover:text-primary transition-colors break-all">
                      demutran.smstcaninde@gmail.com
                    </a>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">DEMUTRAN</p>
                    <a href="mailto:demutran.smstcaninde@gmail.com" className="text-muted-foreground hover:text-primary transition-colors break-all">
                      demutran.smstcaninde@gmail.com
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-border hover:border-primary transition-all duration-300 bg-gradient-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-primary p-3 rounded-xl">
                      <MapPin className="h-6 w-6 text-primary-foreground" />
                    </div>
                    Endereço
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-2">
                    Av. Raimundo Alcoforado, 777<br />
                    Alto Guaramiranga<br />
                    Canindé - CE
                  </p>
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=Guarda+Municipal+de+Canindé,+Av.+Raimundo+Alcoforado,+777+-+Alto+Guaramiranga,+Canindé+-+CE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-light transition-colors font-semibold"
                  >
                    Ver no mapa →
                  </a>
                </CardContent>
              </Card>

              <Card className="border-2 border-border hover:border-primary transition-all duration-300 bg-gradient-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-primary p-3 rounded-xl">
                      <Clock className="h-6 w-6 text-primary-foreground" />
                    </div>
                    Horário de Atendimento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="font-semibold text-foreground">Segunda a Quinta-feira</p>
                    <p className="text-muted-foreground">07:30 às 11:00 e 13:30 às 17:00</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Sexta-feira</p>
                    <p className="text-muted-foreground">07:30 às 13:30</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Social Media and Transparency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-2 border-secondary bg-secondary/10">
                <CardHeader>
                  <CardTitle className="text-foreground">Redes Sociais</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Acompanhe nossas redes sociais para ficar por dentro das novidades e ações da Secretaria de Segurança.
                  </p>
                  <div className="flex gap-4">
                    <a 
                      href="https://www.instagram.com/smst.caninde/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary-light transition-all duration-300"
                    >
                      <Instagram className="h-5 w-5" />
                      <span>Instagram</span>
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-secondary bg-secondary/10">
                <CardHeader>
                  <CardTitle className="text-foreground">Transparência</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Acesse informações sobre licitações, prestação de contas e ouvidoria.
                  </p>
                  <div className="space-y-2">
                    <a 
                      href="#" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-primary hover:text-primary-light transition-colors font-semibold"
                    >
                      Portal da Transparência →
                    </a>
                    <a 
                      href="#" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-primary hover:text-primary-light transition-colors font-semibold"
                    >
                      Ouvidoria →
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contato;
