    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
-- Name: atualizar_updated_at(); Type: FUNCTION; Schema: public; Owner: -
CREATE FUNCTION public.atualizar_updated_at() RETURNS trigger
CREATE TABLE _realtime.extensions (
CREATE TABLE _realtime.schema_migrations (
CREATE TABLE _realtime.tenants (
    max_concurrent_users integer DEFAULT 200 NOT NULL,
CREATE TABLE auth.audit_log_entries (
CREATE TABLE auth.flow_state (
CREATE TABLE auth.identities (
CREATE TABLE auth.instances (
COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';
CREATE TABLE auth.mfa_amr_claims (
CREATE TABLE auth.mfa_challenges (
CREATE TABLE auth.mfa_factors (
CREATE TABLE auth.oauth_authorizations (
CREATE TABLE auth.oauth_clients (
CREATE TABLE auth.oauth_consents (
CREATE TABLE auth.one_time_tokens (
CREATE TABLE auth.refresh_tokens (
CREATE TABLE auth.saml_providers (
CREATE TABLE auth.saml_relay_states (
CREATE TABLE auth.schema_migrations (
CREATE TABLE auth.sessions (
CREATE TABLE auth.sso_domains (
CREATE TABLE auth.sso_providers (
-- Name: users; Type: TABLE; Schema: auth; Owner: -
CREATE TABLE auth.users (
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';
-- Name: eventos; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.eventos (
-- Name: galeria_fotos; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.galeria_fotos (
-- Name: noticias; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.noticias (
-- Name: projetos; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.projetos (
-- Name: users; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.users (
CREATE TABLE realtime.messages (
CREATE TABLE realtime.messages_2025_10_19 (
CREATE TABLE realtime.messages_2025_10_20 (
CREATE TABLE realtime.messages_2025_10_21 (
CREATE TABLE realtime.messages_2025_10_22 (
CREATE TABLE realtime.messages_2025_10_23 (
CREATE TABLE realtime.schema_migrations (
CREATE TABLE realtime.subscription (
CREATE TABLE storage.buckets (
CREATE TABLE storage.buckets_analytics (
CREATE TABLE storage.iceberg_namespaces (
CREATE TABLE storage.iceberg_tables (
CREATE TABLE storage.migrations (
CREATE TABLE storage.objects (
CREATE TABLE storage.prefixes (
CREATE TABLE storage.s3_multipart_uploads (
CREATE TABLE storage.s3_multipart_uploads_parts (
CREATE TABLE supabase_functions.hooks (
CREATE TABLE supabase_functions.migrations (
CREATE TABLE supabase_migrations.schema_migrations (
CREATE TABLE supabase_migrations.seed_files (
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
-- Name: eventos eventos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT eventos_pkey PRIMARY KEY (id);
-- Name: galeria_fotos galeria_fotos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.galeria_fotos
    ADD CONSTRAINT galeria_fotos_pkey PRIMARY KEY (id);
-- Name: noticias noticias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.noticias
    ADD CONSTRAINT noticias_pkey PRIMARY KEY (id);
-- Name: projetos projetos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.projetos
    ADD CONSTRAINT projetos_pkey PRIMARY KEY (id);
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);
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
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
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
-- Name: eventos; Type: ROW SECURITY; Schema: public; Owner: -
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
-- Name: galeria_fotos; Type: ROW SECURITY; Schema: public; Owner: -
ALTER TABLE public.galeria_fotos ENABLE ROW LEVEL SECURITY;
-- Name: noticias; Type: ROW SECURITY; Schema: public; Owner: -
ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;
-- Name: projetos; Type: ROW SECURITY; Schema: public; Owner: -
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
