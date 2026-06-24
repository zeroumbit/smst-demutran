CREATE TABLE public.demutran_midias (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  setor_id      uuid NOT NULL REFERENCES public.setores(id),
  titulo        text NOT NULL,
  tipo          text NOT NULL CHECK (tipo IN ('texto', 'video')),
  descricao     text NOT NULL,
  arquivo_url   text,
  video_url     text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id)
);

ALTER TABLE public.demutran_midias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demutran_midias_select_public"
  ON public.demutran_midias FOR SELECT
  USING (true);

CREATE POLICY "demutran_midias_insert_setor"
  ON public.demutran_midias FOR INSERT
  WITH CHECK (public.can_manage_setor_content(setor_id));

CREATE POLICY "demutran_midias_update_setor"
  ON public.demutran_midias FOR UPDATE
  USING (public.can_manage_setor_content(setor_id));

CREATE POLICY "demutran_midias_delete_setor"
  ON public.demutran_midias FOR DELETE
  USING (public.can_manage_setor_content(setor_id));
