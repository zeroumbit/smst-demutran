import { supabase } from '@/lib/supabase';
import type { ModuloSistema, PapelUsuario } from '@/types/admin';

export interface ProvisionAdminUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  setorId: string | null;
  papel: PapelUsuario;
  active: boolean;
  modulos?: ModuloSistema[];
}

export async function provisionAdminUser(input: ProvisionAdminUserInput) {
  const payload: Record<string, any> = {
    _email: input.email,
    _password: input.password,
    _first_name: input.firstName,
    _last_name: input.lastName,
    _setor_id: input.setorId,
    _papel: input.papel,
    _active: input.active,
  };

  if (input.modulos?.length) {
    payload._modulos = input.modulos;
  }

  const { data, error } = await supabase.rpc('provision_admin_user', payload);

  if (error && error.code === 'PGRST202') {
    const fallbackResponse = await supabase.functions.invoke('provision-admin-user', {
      body: {
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        setorId: input.setorId,
        papel: input.papel,
        active: input.active,
        modulos: input.modulos,
      },
    });

    if (fallbackResponse.error) {
      throw new Error(fallbackResponse.error.message || 'Falha ao provisionar usuario administrativo.');
    }

    if (fallbackResponse.data?.error) {
      throw new Error(fallbackResponse.data.error);
    }

    return fallbackResponse.data;
  }

  if (error) {
    throw new Error(error.message || 'Falha ao provisionar usuario administrativo.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}
