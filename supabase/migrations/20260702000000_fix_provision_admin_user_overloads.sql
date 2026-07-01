-- Remove old overload (7 params, without _modulos) left by security_hardening migration
-- Keeps only the 8-param version with _modulos jsonb DEFAULT NULL
DROP FUNCTION IF EXISTS public.provision_admin_user(
  _email text,
  _password text,
  _first_name text,
  _last_name text,
  _setor_id uuid,
  _papel public.papel_usuario,
  _active boolean
);
