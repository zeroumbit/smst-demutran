CREATE TABLE public.eventos (
CREATE TABLE public.galeria_fotos (
CREATE TABLE public.noticias (
CREATE TABLE public.projetos (
CREATE TABLE public.users (
ALTER TABLE ONLY public.eventos
ALTER TABLE ONLY public.galeria_fotos
ALTER TABLE ONLY public.noticias
ALTER TABLE ONLY public.projetos
ALTER TABLE ONLY public.users
ALTER TABLE ONLY public.users
-- Name: eventos trigger_atualizar_eventos_updated_at; Type: TRIGGER; Schema: public; Owner: -
CREATE TRIGGER trigger_atualizar_eventos_updated_at BEFORE UPDATE ON public.eventos FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();
-- Name: galeria_fotos trigger_atualizar_galeria_fotos_updated_at; Type: TRIGGER; Schema: public; Owner: -
CREATE TRIGGER trigger_atualizar_galeria_fotos_updated_at BEFORE UPDATE ON public.galeria_fotos FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();
-- Name: noticias trigger_atualizar_noticias_updated_at; Type: TRIGGER; Schema: public; Owner: -
CREATE TRIGGER trigger_atualizar_noticias_updated_at BEFORE UPDATE ON public.noticias FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();
-- Name: projetos trigger_atualizar_projetos_updated_at; Type: TRIGGER; Schema: public; Owner: -
CREATE TRIGGER trigger_atualizar_projetos_updated_at BEFORE UPDATE ON public.projetos FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();
-- Name: users trigger_atualizar_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
CREATE TRIGGER trigger_atualizar_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();
-- Name: eventos Admin full access eventos; Type: POLICY; Schema: public; Owner: -
CREATE POLICY "Admin full access eventos" ON public.eventos USING ((auth.role() = 'authenticated'::text));
-- Name: galeria_fotos Admin full access galeria_fotos; Type: POLICY; Schema: public; Owner: -
CREATE POLICY "Admin full access galeria_fotos" ON public.galeria_fotos USING ((auth.role() = 'authenticated'::text));
-- Name: noticias Admin full access noticias; Type: POLICY; Schema: public; Owner: -
CREATE POLICY "Admin full access noticias" ON public.noticias USING ((auth.role() = 'authenticated'::text));
-- Name: projetos Admin full access projetos; Type: POLICY; Schema: public; Owner: -
CREATE POLICY "Admin full access projetos" ON public.projetos USING ((auth.role() = 'authenticated'::text));
-- Name: users Admin full access users; Type: POLICY; Schema: public; Owner: -
CREATE POLICY "Admin full access users" ON public.users USING ((auth.role() = 'authenticated'::text));
-- Name: eventos Public read active eventos; Type: POLICY; Schema: public; Owner: -
CREATE POLICY "Public read active eventos" ON public.eventos FOR SELECT USING ((ativo = true));
-- Name: galeria_fotos Public read active galeria_fotos; Type: POLICY; Schema: public; Owner: -
CREATE POLICY "Public read active galeria_fotos" ON public.galeria_fotos FOR SELECT USING ((ativo = true));
-- Name: noticias Public read active noticias; Type: POLICY; Schema: public; Owner: -
CREATE POLICY "Public read active noticias" ON public.noticias FOR SELECT USING ((ativo = true));
-- Name: projetos Public read active projetos; Type: POLICY; Schema: public; Owner: -
CREATE POLICY "Public read active projetos" ON public.projetos FOR SELECT USING ((ativo = true));
ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galeria_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.iceberg_namespaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.iceberg_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;
