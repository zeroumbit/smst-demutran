export const FISCALIZACAO_ADMIN_BASE = '/admin/fiscalizacao';
export const FISCALIZACAO_GUARDA_BASE = '/admin/perfil-guardas/guarda-municipal/fiscalizacao';

export const fiscalizacaoRoutes = {
  admin: {
    infracoes: `${FISCALIZACAO_ADMIN_BASE}/infracoes`,
    categorias: `${FISCALIZACAO_ADMIN_BASE}/categorias`,
    detalhe: (codigo: string) => `${FISCALIZACAO_ADMIN_BASE}/infracoes/${codigo}`,
  },
  guarda: {
    infracoes: `${FISCALIZACAO_GUARDA_BASE}/infracoes`,
    categorias: `${FISCALIZACAO_GUARDA_BASE}/categorias`,
    detalhe: (codigo: string) => `${FISCALIZACAO_GUARDA_BASE}/infracoes/${codigo}`,
  },
};
