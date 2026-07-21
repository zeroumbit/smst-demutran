-- =====================================================
-- Migration: Fix CASCADE delete on guarda_escala_agentes
-- =====================================================
-- O trigger guarda_escala_agentes_audit_trigger tenta
-- inserir em guarda_escala_historico quando um agente
-- e removido via CASCADE (DELETE da escala). Como a
-- escala ja foi deletada, a FK falha.
-- 
-- A solucao e pular o historico quando a escala nao
-- existe mais (CASCADE em andamento).
-- =====================================================

CREATE OR REPLACE FUNCTION public.guarda_escala_agentes_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.registrar_guarda_escala_historico(NEW.escala_id, NULL, NEW.guarda_id, 'AGENTE_ADICIONADO', 'Agente adicionado a escala', to_jsonb(NEW));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    PERFORM public.registrar_guarda_escala_historico(NEW.escala_id, NULL, NEW.guarda_id, 'AGENTE_ATUALIZADO', 'Agente atualizado na escala');
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    SELECT EXISTS(SELECT 1 FROM public.guarda_escalas WHERE id = OLD.escala_id) INTO v_exists;
    IF v_exists THEN
      PERFORM public.registrar_guarda_escala_historico(OLD.escala_id, NULL, OLD.guarda_id, 'AGENTE_REMOVIDO', 'Agente removido da escala', to_jsonb(OLD));
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;
