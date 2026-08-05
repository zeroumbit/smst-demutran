-- Indica se o setor possui (ou nao) pagina publica no portal.
-- Setores criados apenas para uso administrativo terao tem_pagina_publica = false.

ALTER TABLE public.setores
  ADD COLUMN IF NOT EXISTS tem_pagina_publica boolean NOT NULL DEFAULT true;
