# Permissoes V2 - Fases 2 e 3 (Guia Detalhado de Execucao)

> **Projeto:** SITE-SMST | **Branch:** develop
> **Data:** 2026-08-05 (previsto para execucao: 2026-08-06)
> **Escopo:** Fase 2 (seed de codigos granulares Demutran/Guarda no catalogo) e Fase 3 (adocao granular no frontend: menu + rotas).
> **Referencia-mestra:** `PERMISSOES_V2_PROXIMAS_FASES.md` (visao geral das fases 2-7).
> **Pre-requisito:** commit `4717321` em develop e migrations v2 ja aplicadas no remoto (`permissions_v2.enabled = false`).

---

## 0. Ordem de execucao do dia

1. Confirmar estado (checklist da secao 0.2).
2. **Fase 2** (DB): criar migration de seed, aplicar no remoto via SQL Editor, rodar verificacoes.
3. **Fase 3.0** (DB): expor `perfil_funcional_id` no profile do frontend.
4. **Fase 3.1 a 3.4** (frontend): helper de codigos, `usePermissionStatus`, gate de menu no AdminLayout, `requisitoPermissao` no ProtectedRoute + App.tsx.
5. Rodar `npx eslint` + `npx tsc -b` e conferir que so existem erros pre-existentes (secao 8 do documento-mestre).
6. Teste manual com 2 usuarios (migrado e nao-migrado) em Demutran e Guarda.

### 0.1 Regras de ouro (nao quebrar)

- **Flag `permissions_v2.enabled` continua `false` o dia todo.** Nada de ligar a flag.
- **Nunca remover acesso que o usuario ja tinha** (mesma regra do passo 5 do `tem_permissao`): o novo motor e aditivo sobre o legado.
- **JGC fica intocado** (rotas `jgc_*`, `allowedJgcPerfis`, `jgc_perfil`, menu JGC). Migracao granular so Demutran/Guarda.
- Rotas com `requireGuarda` (fluxo pessoal do guarda) **nao** recebem `requisitoPermissao`.
- Zero novos erros de `tsc`/eslint.

### 0.2 Checklist de inicio de sessao

```bash
git branch --show-current   # develop
git status --short          # limpo
git log --oneline -3        # 4717321 no topo
```

Verificar no remoto (SQL Editor):

```sql
SELECT config FROM public.configuracoes
WHERE grupo = 'permissions_v2' AND tipo = 'enabled';          -- {"enabled": false}
SELECT count(*) FROM public.setor_modulos;                    -- 22
SELECT count(*) FROM public.permissoes_sistema WHERE ativo;   -- 26 (so JGC)
SELECT count(*) FROM public.perfis_usuarios WHERE perfil_funcional_id IS NOT NULL; -- 0
```

---

# FASE 2 - Seed dos codigos granulares Demutran/Guarda

## 2.1 Objetivo

Popular `permissoes_sistema` com os codigos dos 14 modulos Demutran/Guarda. Sem isso:
- `tem_permissao` retorna **false** para usuario migrado com codigo nao catalogado (linha 353-355 do `20260805130000`);
- o painel "Revisao de acessos" (`get_usuario_permissoes`) so lista JGC hoje (filtra por `sm.setor_id`);
- a Fase 3 nao tem codigo para consultar.

## 2.2 Schema de destino (`permissoes_sistema`)

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | auto |
| `modulo_id` | uuid FK `setor_modulos(id)` | modulo do setor |
| `codigo` | text UNIQUE | `<setor>.<modulo>.<acao>` |
| `nome` | text | rotulo |
| `descricao` | text | |
| `acao` | text | `visualizar`/`criar`/`editar`/`inativar`/`excluir` |
| `sensivel` | bool | `true` p/ destrutivas/irreversiveis |
| `ativo` | bool | `true` |

> **Decisao de nomenclatura:** codigo no formato `<setor>.<modulo>.<acao>` com nome **semantico** do modulo (ex.: `guarda_municipal.escalas.visualizar`, nao `guarda_municipal.guarda_escalas...`), seguindo o padrao JGC (`jovem_guarda.alunos.visualizar` — prefixo semantico, nao o slug `jgc_alunos`).

## 2.3 Por que o JOIN do seed JGC nao serve

O seed `20260805140000` faz `JOIN ... ON m.prefixo = sm.prefixo`. O prefixo `midias` existe em **Demutran e Guarda** (mesmo `prefixo`, `UNIQUE (setor_id, prefixo)` permite, mas `codigo` e UNIQUE global). O INSERT da Fase 2 deve resolver por **`setor.slug` + `setor_modulos.slug`**, nunca so pelo prefixo.

## 2.4 Lista completa de codigos (50)

### Demutran (24) — `setor_slug='demutran'`

| modulo_slug | codigo | sensivel |
|---|---|---|
| veiculos | `demutran.veiculos.visualizar` | false |
| veiculos | `demutran.veiculos.criar` | false |
| veiculos | `demutran.veiculos.editar` | false |
| veiculos | `demutran.veiculos.inativar` | true |
| concessionarios | `demutran.concessionarios.visualizar` | false |
| concessionarios | `demutran.concessionarios.criar` | false |
| concessionarios | `demutran.concessionarios.editar` | false |
| credenciais | `demutran.credenciais.visualizar` | false |
| credenciais | `demutran.credenciais.criar` | false |
| credenciais | `demutran.credenciais.editar` | false |
| recursos | `demutran.recursos.visualizar` | false |
| recursos | `demutran.recursos.criar` | false |
| recursos | `demutran.recursos.editar` | false |
| recursos | `demutran.recursos.excluir` | true |
| frota | `demutran.frota.visualizar` | false |
| frota | `demutran.frota.criar` | false |
| frota | `demutran.frota.editar` | false |
| documentos | `demutran.documentos.visualizar` | false |
| documentos | `demutran.documentos.criar` | false |
| documentos | `demutran.documentos.editar` | false |
| midias | `demutran.midias.visualizar` | false |
| midias | `demutran.midias.criar` | false |
| midias | `demutran.midias.editar` | false |
| midias | `demutran.midias.excluir` | true |

### Guarda Municipal (26) — `setor_slug='guarda-municipal'`

| modulo_slug | codigo | sensivel |
|---|---|---|
| iros | `guarda_municipal.iros.visualizar` | false |
| iros | `guarda_municipal.iros.criar` | false |
| iros | `guarda_municipal.iros.editar` | false |
| guardas | `guarda_municipal.guardas.visualizar` | false |
| guardas | `guarda_municipal.guardas.criar` | false |
| guardas | `guarda_municipal.guardas.editar` | false |
| guardas | `guarda_municipal.guardas.inativar` | true |
| guarda_escalas | `guarda_municipal.escalas.visualizar` | false |
| guarda_escalas | `guarda_municipal.escalas.criar` | false |
| guarda_escalas | `guarda_municipal.escalas.editar` | false |
| guarda_escalas | `guarda_municipal.escalas.excluir` | true |
| guarda_frota | `guarda_municipal.frota.visualizar` | false |
| guarda_frota | `guarda_municipal.frota.criar` | false |
| guarda_frota | `guarda_municipal.frota.editar` | false |
| guarda_equipes | `guarda_municipal.equipes.visualizar` | false |
| guarda_equipes | `guarda_municipal.equipes.criar` | false |
| guarda_equipes | `guarda_municipal.equipes.editar` | false |
| guarda_equipes | `guarda_municipal.equipes.excluir` | true |
| fiscalizacao | `guarda_municipal.fiscalizacao.visualizar` | false |
| fiscalizacao | `guarda_municipal.fiscalizacao.criar` | false |
| fiscalizacao | `guarda_municipal.fiscalizacao.editar` | false |
| fiscalizacao | `guarda_municipal.fiscalizacao.excluir` | true |
| midias | `guarda_municipal.midias.visualizar` | false |
| midias | `guarda_municipal.midias.criar` | false |
| midias | `guarda_municipal.midias.editar` | false |
| midias | `guarda_municipal.midias.excluir` | true |

Total esperado no catalogo apos Fase 2: **76** (26 JGC + 50).

## 2.5 Migration pronta

Arquivo: `supabase/migrations/20260806010000_permissions_v2_codes_demutran_guarda.sql`

```sql
-- =====================================================
-- Permissions V2 - Seed codigos granulares Demutran/Guarda
-- Fase 2. Nao altera comportamento (flag ainda off).
-- Reversivel: DELETE das linhas inseridas por prefixo 'demutran.'/'guarda_municipal.'
-- =====================================================
INSERT INTO public.permissoes_sistema (modulo_id, codigo, nome, descricao, acao, sensivel, ativo)
SELECT sm.id, m.codigo, m.codigo, m.descricao, m.acao, m.sensivel, true
FROM public.setor_modulos sm
JOIN public.setores s ON s.id = sm.setor_id
JOIN (
  VALUES
    -- ---- Demutran ----
    ('demutran', 'veiculos', 'demutran.veiculos.visualizar', 'Visualizar veiculos', 'visualizar', false),
    ('demutran', 'veiculos', 'demutran.veiculos.criar', 'Cadastrar veiculos', 'criar', false),
    ('demutran', 'veiculos', 'demutran.veiculos.editar', 'Editar veiculos', 'editar', false),
    ('demutran', 'veiculos', 'demutran.veiculos.inativar', 'Inativar veiculos', 'inativar', true),
    ('demutran', 'concessionarios', 'demutran.concessionarios.visualizar', 'Visualizar concessionarios', 'visualizar', false),
    ('demutran', 'concessionarios', 'demutran.concessionarios.criar', 'Cadastrar concessionarios', 'criar', false),
    ('demutran', 'concessionarios', 'demutran.concessionarios.editar', 'Editar concessionarios', 'editar', false),
    ('demutran', 'credenciais', 'demutran.credenciais.visualizar', 'Visualizar credenciais', 'visualizar', false),
    ('demutran', 'credenciais', 'demutran.credenciais.criar', 'Cadastrar credenciais', 'criar', false),
    ('demutran', 'credenciais', 'demutran.credenciais.editar', 'Editar credenciais', 'editar', false),
    ('demutran', 'recursos', 'demutran.recursos.visualizar', 'Visualizar recursos', 'visualizar', false),
    ('demutran', 'recursos', 'demutran.recursos.criar', 'Cadastrar recursos', 'criar', false),
    ('demutran', 'recursos', 'demutran.recursos.editar', 'Editar recursos', 'editar', false),
    ('demutran', 'recursos', 'demutran.recursos.excluir', 'Excluir recursos', 'excluir', true),
    ('demutran', 'frota', 'demutran.frota.visualizar', 'Visualizar frota municipal', 'visualizar', false),
    ('demutran', 'frota', 'demutran.frota.criar', 'Cadastrar veiculo de frota', 'criar', false),
    ('demutran', 'frota', 'demutran.frota.editar', 'Editar veiculo de frota', 'editar', false),
    ('demutran', 'documentos', 'demutran.documentos.visualizar', 'Visualizar documentos', 'visualizar', false),
    ('demutran', 'documentos', 'demutran.documentos.criar', 'Cadastrar documentos', 'criar', false),
    ('demutran', 'documentos', 'demutran.documentos.editar', 'Editar documentos', 'editar', false),
    ('demutran', 'midias', 'demutran.midias.visualizar', 'Visualizar midias', 'visualizar', false),
    ('demutran', 'midias', 'demutran.midias.criar', 'Cadastrar midias', 'criar', false),
    ('demutran', 'midias', 'demutran.midias.editar', 'Editar midias', 'editar', false),
    ('demutran', 'midias', 'demutran.midias.excluir', 'Excluir midias', 'excluir', true),
    -- ---- Guarda Municipal ----
    ('guarda-municipal', 'iros', 'guarda_municipal.iros.visualizar', 'Visualizar IROs', 'visualizar', false),
    ('guarda-municipal', 'iros', 'guarda_municipal.iros.criar', 'Cadastrar IROs', 'criar', false),
    ('guarda-municipal', 'iros', 'guarda_municipal.iros.editar', 'Editar IROs', 'editar', false),
    ('guarda-municipal', 'guardas', 'guarda_municipal.guardas.visualizar', 'Visualizar guardas', 'visualizar', false),
    ('guarda-municipal', 'guardas', 'guarda_municipal.guardas.criar', 'Cadastrar guardas', 'criar', false),
    ('guarda-municipal', 'guardas', 'guarda_municipal.guardas.editar', 'Editar guardas', 'editar', false),
    ('guarda-municipal', 'guardas', 'guarda_municipal.guardas.inativar', 'Inativar guardas', 'inativar', true),
    ('guarda-municipal', 'guarda_escalas', 'guarda_municipal.escalas.visualizar', 'Visualizar escalas da guarda', 'visualizar', false),
    ('guarda-municipal', 'guarda_escalas', 'guarda_municipal.escalas.criar', 'Cadastrar escalas', 'criar', false),
    ('guarda-municipal', 'guarda_escalas', 'guarda_municipal.escalas.editar', 'Editar escalas', 'editar', false),
    ('guarda-municipal', 'guarda_escalas', 'guarda_municipal.escalas.excluir', 'Excluir escalas', 'excluir', true),
    ('guarda-municipal', 'guarda_frota', 'guarda_municipal.frota.visualizar', 'Visualizar frota da guarda', 'visualizar', false),
    ('guarda-municipal', 'guarda_frota', 'guarda_municipal.frota.criar', 'Cadastrar veiculo da guarda', 'criar', false),
    ('guarda-municipal', 'guarda_frota', 'guarda_municipal.frota.editar', 'Editar veiculo da guarda', 'editar', false),
    ('guarda-municipal', 'guarda_equipes', 'guarda_municipal.equipes.visualizar', 'Visualizar equipes da guarda', 'visualizar', false),
    ('guarda-municipal', 'guarda_equipes', 'guarda_municipal.equipes.criar', 'Cadastrar equipes', 'criar', false),
    ('guarda-municipal', 'guarda_equipes', 'guarda_municipal.equipes.editar', 'Editar equipes', 'editar', false),
    ('guarda-municipal', 'guarda_equipes', 'guarda_municipal.equipes.excluir', 'Excluir equipes', 'excluir', true),
    ('guarda-municipal', 'fiscalizacao', 'guarda_municipal.fiscalizacao.visualizar', 'Visualizar fiscalizacao', 'visualizar', false),
    ('guarda-municipal', 'fiscalizacao', 'guarda_municipal.fiscalizacao.criar', 'Cadastrar infracoes', 'criar', false),
    ('guarda-municipal', 'fiscalizacao', 'guarda_municipal.fiscalizacao.editar', 'Editar infracoes', 'editar', false),
    ('guarda-municipal', 'fiscalizacao', 'guarda_municipal.fiscalizacao.excluir', 'Excluir infracoes', 'excluir', true),
    ('guarda-municipal', 'midias', 'guarda_municipal.midias.visualizar', 'Visualizar midias', 'visualizar', false),
    ('guarda-municipal', 'midias', 'guarda_municipal.midias.criar', 'Cadastrar midias', 'criar', false),
    ('guarda-municipal', 'midias', 'guarda_municipal.midias.editar', 'Editar midias', 'editar', false),
    ('guarda-municipal', 'midias', 'guarda_municipal.midias.excluir', 'Excluir midias', 'excluir', true)
) AS m(setor_slug, modulo_slug, codigo, descricao, acao, sensivel)
  ON m.setor_slug = s.slug AND m.modulo_slug = sm.slug
ON CONFLICT (codigo) DO NOTHING;
```

> `nome` foi preenchido com o proprio `codigo` (evita duplicar a lista); se preferir rotulos bonitos, troque `m.codigo` por uma coluna `nome` no VALUES.

## 2.6 Verificacoes apos aplicar

```sql
SELECT count(*) FROM public.permissoes_sistema WHERE ativo;                          -- 76
SELECT codigo, count(*) FROM public.permissoes_sistema GROUP BY codigo HAVING count(*)>1; -- 0 linhas
-- Modulos da guarda visiveis no catalogo:
SELECT sm.slug, ps.codigo, ps.acao, ps.sensivel
FROM public.permissoes_sistema ps
JOIN public.setor_modulos sm ON sm.id = ps.modulo_id
WHERE sm.setor_id = (SELECT id FROM public.setores WHERE slug='guarda-municipal')
ORDER BY sm.slug, ps.acao;                                                            -- 26 linhas
-- Painel de revisao agora lista Demutran/Guarda (rodar como super admin):
SELECT * FROM public.get_usuario_permissoes(
  (SELECT id FROM public.perfis_usuarios LIMIT 1)
) WHERE modulo_slug IN ('veiculos','iros');
```

## 2.7 Criterio de aceite

- [ ] Catalogo com 76 permissoes ativas, sem codigo duplicado.
- [ ] `get_usuario_permissoes` lista modulos Demutran e Guarda.
- [ ] Criar (via UI `Usuarios.tsx`) um perfil funcional "Teste Demutran" com `demutran.veiculos.visualizar` e conferir que `tem_permissao('demutran.veiculos.visualizar')` volta `true` para o usuario vinculado (flag continua false -> cai na compatibilidade legada; o teste real de motor granular acontece na Fase 4/6).

## 2.8 Rollback

```sql
DELETE FROM public.permissoes_sistema
WHERE codigo LIKE 'demutran.%' OR codigo LIKE 'guarda_municipal.%';
```

---

# FASE 3 - Adocao granular no frontend (menu + rotas)

**Depende da Fase 2.** Objetivo: menu lateral e protecao de rota passarem a refletir o codigo granular, via `tem_permissao`, **sem flash e sem regressao**. Como a flag segue `false`, `tem_permissao` == `legacy_tem_permissao` hoje, entao o comportamento e identico ao atual — e ja fica pronto para a Fase 6.

## 3.0 Expor `perfil_funcional_id` no profile (DB + tipos)

Hoje `get_user_profile()` **nao** retorna `perfil_funcional_id` (definicao atual em `20260728000002_add_jgc_perfil_to_get_user_profile.sql`) e `AdminProfile` (`src/types/admin.ts`, linhas 65-86) nao tem o campo. Sem isso o frontend nao sabe quem esta "migrado".

**Migration:** `supabase/migrations/20260806020000_expose_perfil_funcional_id.sql`

```sql
CREATE OR REPLACE FUNCTION public.get_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_user auth.users%ROWTYPE;
  profile_row RECORD;
  resolved_name text;
  jgc_perfil_val text;
  jgc_area_val text;
BEGIN
  SELECT * INTO auth_user FROM auth.users WHERE id = auth.uid();
  IF auth_user.id IS NULL THEN RETURN NULL; END IF;

  SELECT
    pu.id AS perfil_id, pu.papel, pu.ativo, pu.nome, pu.sobrenome,
    s.id AS setor_id, s.nome AS setor_nome, s.slug AS setor_slug,
    pu.graduacao_id, ggn.nome AS graduacao_nome,
    pu.perfil_funcional_id
  INTO profile_row
  FROM public.perfis_usuarios pu
  LEFT JOIN public.setores s ON s.id = pu.setor_id
  LEFT JOIN public.guarda_municipal_graduacoes ggn ON ggn.id = pu.graduacao_id
  WHERE pu.user_id = auth.uid() AND pu.ativo = true
  ORDER BY CASE pu.papel WHEN 'super_admin' THEN 1 WHEN 'gestor' THEN 2
           WHEN 'admin_setor' THEN 3 ELSE 4 END
  LIMIT 1;

  SELECT jp.perfil::text, jp.area_atuacao
  INTO jgc_perfil_val, jgc_area_val
  FROM public.jgc_perfis jp
  WHERE jp.perfil_usuario_id = profile_row.perfil_id AND jp.ativo;

  resolved_name := COALESCE(
    NULLIF(auth_user.raw_user_meta_data ->> 'name', ''),
    NULLIF(trim(COALESCE(profile_row.nome, auth_user.raw_user_meta_data ->> 'first_name','')
      || ' ' || COALESCE(profile_row.sobrenome, auth_user.raw_user_meta_data ->> 'last_name','')), ''),
    auth_user.email
  );

  IF profile_row.perfil_id IS NULL AND public.has_legacy_admin(auth.uid()) THEN
    RETURN jsonb_build_object('user_id', auth_user.id, 'email', auth_user.email, 'name', resolved_name,
      'first_name', auth_user.raw_user_meta_data ->> 'first_name', 'last_name', auth_user.raw_user_meta_data ->> 'last_name',
      'papel', 'super_admin', 'perfil_id', NULL, 'setor_id', NULL, 'setor_nome', NULL, 'setor_slug', NULL,
      'ativo', true, 'legacy_admin', true, 'graduacao_id', NULL, 'graduacao_nome', NULL,
      'jgc_perfil', NULL, 'jgc_area_atuacao', NULL, 'perfil_funcional_id', NULL);
  END IF;

  IF profile_row.perfil_id IS NULL THEN
    RETURN jsonb_build_object('user_id', auth_user.id, 'email', auth_user.email, 'name', resolved_name,
      'first_name', auth_user.raw_user_meta_data ->> 'first_name', 'last_name', auth_user.raw_user_meta_data ->> 'last_name',
      'papel', NULL, 'perfil_id', NULL, 'setor_id', NULL, 'setor_nome', NULL, 'setor_slug', NULL,
      'ativo', false, 'legacy_admin', false, 'graduacao_id', NULL, 'graduacao_nome', NULL,
      'jgc_perfil', NULL, 'jgc_area_atuacao', NULL, 'perfil_funcional_id', NULL);
  END IF;

  RETURN jsonb_build_object(
    'user_id', auth_user.id, 'email', auth_user.email, 'name', resolved_name,
    'first_name', profile_row.nome, 'last_name', profile_row.sobrenome,
    'papel', profile_row.papel, 'perfil_id', profile_row.perfil_id,
    'setor_id', profile_row.setor_id, 'setor_nome', profile_row.setor_nome, 'setor_slug', profile_row.setor_slug,
    'ativo', profile_row.ativo, 'legacy_admin', false,
    'graduacao_id', profile_row.graduacao_id, 'graduacao_nome', profile_row.graduacao_nome,
    'jgc_perfil', jgc_perfil_val, 'jgc_area_atuacao', jgc_area_val,
    'perfil_funcional_id', profile_row.perfil_funcional_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile() TO authenticated;
```

**Frontend** — `src/types/admin.ts` (AdminProfile, ~linha 82):

```ts
jgc_area_atuacao?: string | null;
perfil_funcional_id?: string | null;
```

> Opcional (lista de usuarios): adicionar `perfil_funcional_id` tambem no retorno de `get_admin_profiles` para exibir "migrado" na tabela de `Usuarios.tsx`. Nao obrigatorio para a Fase 3.

## 3.1 Helper de codigos por modulo (novo arquivo `src/lib/adminPermissions.ts`)

Mapeia `ModuloSistema` -> codigo `visualizar` por setor, espelhando `MODULOS_POR_SETOR` (`src/types/admin.ts:59`).

```ts
import type { ModuloSistema } from '@/types/admin';

export const CODIGO_VISUALIZAR_POR_MODULO: Partial<Record<ModuloSistema, string>> = {
  veiculos: 'demutran.veiculos.visualizar',
  concessionarios: 'demutran.concessionarios.visualizar',
  credenciais: 'demutran.credenciais.visualizar',
  recursos: 'demutran.recursos.visualizar',
  frota: 'demutran.frota.visualizar',
  documentos: 'demutran.documentos.visualizar',
  midias: 'demutran.midias.visualizar', // ambiguo -> setor decide abaixo
  iros: 'guarda_municipal.iros.visualizar',
  guardas: 'guarda_municipal.guardas.visualizar',
  guarda_escalas: 'guarda_municipal.escalas.visualizar',
  guarda_frota: 'guarda_municipal.frota.visualizar',
  guarda_equipes: 'guarda_municipal.equipes.visualizar',
  fiscalizacao: 'guarda_municipal.fiscalizacao.visualizar',
};

// 'midias' e ambíguo (existe em Demutran e Guarda): resolve pelo setor.
export function codigoVisualizarModulo(setorSlug: string | null | undefined, modulo: ModuloSistema): string | null {
  if (modulo === 'midias') {
    if (setorSlug === 'demutran') return 'demutran.midias.visualizar';
    if (setorSlug === 'guarda-municipal') return 'guarda_municipal.midias.visualizar';
    return null;
  }
  return CODIGO_VISUALIZAR_POR_MODULO[modulo] ?? null;
}

// Codigos de um usuario por setor (para o usePermissions do menu).
export function codigosVisualizarDoSetor(setorSlug: string | null | undefined): string[] {
  const modulos = (setorSlug === 'demutran' || setorSlug === 'guarda-municipal')
    ? [] // na pratica vem de MODULOS_POR_SETOR; manter importado
    : [];
  return modulos
    .map((m) => codigoVisualizarModulo(setorSlug, m.value))
    .filter((c): c is string => !!c);
}
```

## 3.2 `usePermissionStatus` (novo hook com estado "resolvendo")

O `usePermission` atual retorna `boolean` iniciando em `false`, o que causaria **redirect em flash** numa guarda de rota. Adicionar em `src/hooks/usePermission.ts`:

```ts
export interface PermissionStatus { resolved: boolean; allowed: boolean; }

export function usePermissionStatus(codigo?: string | null): PermissionStatus {
  const { isSuperAdmin } = useAuth();
  const [state, setState] = useState<PermissionStatus>(() => ({
    resolved: !codigo,
    allowed: !!(isSuperAdmin && codigo),
  }));

  useEffect(() => {
    if (!codigo) { setState({ resolved: true, allowed: false }); return; }
    if (isSuperAdmin) { setState({ resolved: true, allowed: true }); return; }
    let active = true;
    setState({ resolved: false, allowed: false });
    hasPermissionRpc(codigo).then((r) => {
      if (active) setState({ resolved: true, allowed: r });
    });
    return () => { active = false; };
  }, [codigo, isSuperAdmin]);

  return state;
}
```

## 3.3 Gate de menu no `AdminLayout.tsx` (~linhas 436-525 `visibleMenuItems`)

Estrategia: **substituir o bloco `hasModulosRestricted`/`moduloItemMap` pelo codigo granular, mantendo fallback legado quando a permissao ainda nao resolveu ou o modulo nao tem codigo.**

1. Importar `usePermissions` (de `@/hooks/usePermission`) e `codigoVisualizarModulo`/`codigosVisualizarDoSetor` (de `@/lib/adminPermissions`).
2. Chamar o hook **no corpo do componente**, antes do `useMemo` de `visibleMenuItems` (depois que `sectorContext` e `profile` existem):

```tsx
const modulosDoSetor = MODULOS_POR_SETOR[sectorContext as keyof typeof MODULOS_POR_SETOR] ?? [];
const codigosMenu = modulosDoSetor
  .map((m) => codigoVisualizarModulo(profile?.setor_slug, m.value))
  .filter((c): c is string => !!c);
const permissoesMenu = usePermissions(codigosMenu);
```

3. No `filterItem`, trocar o bloco atual (linhas 499-504):

```tsx
// ATUAL:
if (hasModulosRestricted) {
  const modulo = moduloItemMap[mappedItem.label];
  if (modulo) {
    return hasStoredModule(userModulos, modulo) ? mappedItem : null;
  }
}
// NOVO:
if (hasModulosRestricted) {
  const modulo = moduloItemMap[mappedItem.label];
  if (modulo) {
    const codigo = codigoVisualizarModulo(profile?.setor_slug, modulo);
    const granularOk = codigo ? permissoesMenu[codigo] : undefined;
    // granular Ok (resolvido) decide; sem codigo/nao resolvido -> legado (zero regressao)
    if (granularOk === true) return mappedItem;
    if (granularOk === false) return null;
    return hasStoredModule(userModulos, modulo) ? mappedItem : null;
  }
}
```

4. Repetir o mesmo ajuste em `searchableItems` (`filterByPapel`, linhas 609-614).
5. **Nao mexer** no fluxo `sectorContext === 'jovem-guarda'` (usa `jgc_perfil`/`allowedJgcPerfis`).
6. Atualizar deps do `useMemo`: adicionar `permissoesMenu`.

> **Flash aceitavel:** enquanto `usePermissions` resolve (assincrono), `permissoesMenu[codigo]` e `undefined` -> cai no legado -> item aparece; depois re-renderiza com o valor granular. Como flag esta off, granular == legado, entao nao ha mudanca visivel hoje.

## 3.4 Rota: `requisitoPermissao` no `ProtectedRoute.tsx` + `App.tsx`

### 3.4.1 `ProtectedRoute.tsx`

Adicionar prop `requisitoPermissao?: string` e usar `usePermissionStatus`. Regra do `tecnico` (compativel com o `requiredModule` ja existente):

```tsx
import { usePermissionStatus } from '@/hooks/usePermission';

interface ProtectedRouteProps {
  // ...existentes
  requisitoPermissao?: string;
}
```

No corpo (depois de `requireGuarda`, antes/em conjunto com o bloco `allowedPapeis`):

```tsx
const { resolved: permissaoResolvida, allowed: permissaoPermitida } =
  usePermissionStatus(requisitoPermissao);

// Enquanto a permissao nao resolveu, NAO redirecionar (evita flash de logout)
if (requisitoPermissao && !permissaoResolvida) {
  return (
    <div className="mobile-safe-screen flex items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  );
}
```

Trocar o fallback de `tecnico` no bloco `allowedPapeis`:

```tsx
const isAllowed = isSuperAdmin
  ? allowSuperAdmin && allowedPapeis.includes('super_admin')
  : hasPapel(...allowedPapeis) ||
    (profile?.papel === 'tecnico' &&
      (requisitoPermissao
        ? permissaoPermitida
        : requiredModule
          ? hasStoredModule((profile?.modulos as ModuloSistema[]) ?? [], requiredModule)
          : !!profile?.modulos?.length));
```

> super admin: `isSuperAdmin` faz `usePermissionStatus` resolver `true` direto (sem chamada RPC).
> gestor/admin_setor: passam por `hasPapel`, nunca chegam na checagem de permissao (acesso pleno do setor, decisao ja tomada).

### 3.4.2 `App.tsx` - onde aplicar

**Trocar `requiredModule` por `requisitoPermissao`** nas rotas Guarda/Demutran com `tecnico` (substituir valor, manter a prop no mesmo lugar):

| Rota | hoje `requiredModule` | novo `requisitoPermissao` |
|---|---|---|
| `/admin/fiscalizacao/infracoes`, `/:codigo`, `/admin/fiscalizacao/categorias` | `fiscalizacao` | `guarda_municipal.fiscalizacao.visualizar` |
| `/admin/iros/guarda-municipal/minhas-iro`, `/*` | `iros` | `guarda_municipal.iros.visualizar` |
| `/admin/guardas/guarda-municipal` | `guardas` | `guarda_municipal.guardas.visualizar` |
| `/admin/guardas/guarda-municipal/frota*` (4 rotas) | `guarda_frota` | `guarda_municipal.frota.visualizar` |
| `/admin/guardas/guarda-municipal/equipes` | `guarda_equipes` | `guarda_municipal.equipes.visualizar` |
| `/admin/guardas/guarda-municipal/escalas/*` | `guarda_escalas` | `guarda_municipal.escalas.visualizar` |

**NAO aplicar `requisitoPermissao` em:**
- rotas JGC (`jgc_*`) — decisao mantida (editor/motor proprios);
- `/admin/demutran/ordens-servico` e `/admin/guardas/guarda-municipal/ordens-servico` — nao ha codigo/catalogo de "ordens de servico"; manter `requiredModule` ausente (comportamento atual);
- rotas `requireGuarda` (fluxo pessoal) — sem mudanca.

> **Zero regressao hoje:** com flag off, `usePermissionStatus` -> `tem_permissao` -> `legacy_tem_permissao`, que avalia o mesmo `modulos` legado do `requiredModule`. A troca e segura antes mesmo da Fase 6.

## 3.5 Verificacao da Fase 3

```bash
npx eslint src/components/admin/AdminLayout.tsx src/components/admin/ProtectedRoute.tsx src/App.tsx src/hooks/usePermission.ts src/lib/adminPermissions.ts
npx tsc -b    # comparar com erros pre-existentes (secao 8 do documento-mestre)
```

Teste manual (2 contas):
1. **Nao-migrado** (`perfil_funcional_id` null): menu e rotas identicos ao de hoje (legado).
2. **Migrado** Demutran: criar perfil funcional so com `demutran.veiculos.visualizar`, vincular a um tecnico, conferir menu mostrando so Veiculos e rota `/admin/demutran/veiculos` acessivel / outras bloqueadas.
   - Como a flag esta off, `tem_permissao` ainda retorna pelo legado (modulos); o teste granular real so vale com flag ligada (Fase 6). Hoje o objetivo e **nao quebrar nada** e a infraestrutura pronta.
3. **Super admin:** tudo visivel/liberado (bypass).

---

## A. Arquivos tocados (resumo da Fase 3)

| Arquivo | Acao |
|---|---|
| `supabase/migrations/20260806020000_expose_perfil_funcional_id.sql` | criar (get_user_profile) |
| `src/types/admin.ts` | `perfil_funcional_id?: string \| null` em AdminProfile |
| `src/lib/adminPermissions.ts` | criar (mapa + helpers) |
| `src/hooks/usePermission.ts` | adicionar `usePermissionStatus` |
| `src/components/admin/AdminLayout.tsx` | gate de menu granular (2 blocos) |
| `src/components/admin/ProtectedRoute.tsx` | prop `requisitoPermissao` + resolver async |
| `src/App.tsx` | trocar `requiredModule` -> `requisitoPermissao` (11 rotas) |

## B. Riscos / armadilhas

- **Nao** trocar `requiredModule` por `requisitoPermissao` nas rotas JGC — `tecnico` JGC legado nao tem codigo granular e seria bloqueado.
- `midias` e ambiguo (Demutran x Guarda): sempre usar `codigoVisualizarModulo(setor, ...)`, nunca o mapa puro.
- Manter `hasStoredModule`/`moduloItemMap` no AdminLayout (fallback legado) — nao deletar na Fase 3.
- Nao esquecer de adicionar `permissoesMenu` nas deps dos `useMemo` (eslint vai apontar).
- `get_user_profile` tem **3 branches de retorno** (legacy admin / sem perfil / normal): incluir `perfil_funcional_id` nos tres.
- Aplicar as duas migrations novas (Fase 2 e 3.0) via **SQL Editor** e registrar no documento-mestre que o `schema_migrations` seguira dessincronizado ate decidirmos `db push`.
