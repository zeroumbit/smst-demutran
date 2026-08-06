# Permissoes V2 - Plano Completo de Execucao (Tudo que falta fazer)

> **Projeto:** SITE-SMST | **Branch:** develop
> **Data:** 2026-08-05 | **Previsao de execucao:** 2026-08-06 em diante
> **Documento unico de trabalho.** Consolida Fases 2 a 7 em detalhe executavel.
> **Documentos anteriores (mantidos como referencia):** `PERMISSOES_V2_PROXIMAS_FASES.md` (visao geral), `PERMISSOES_V2_FASES_2_E_3_DETALHADO.md` (detalhe 2-3).
> **Pre-requisito:** commit `4717321` e `a8053c8` em develop; migrations v2 aplicadas no remoto com `permissions_v2.enabled = false`.

---

## 1. Visao geral do que falta

| # | Fase | Tipo | Depende de | Status |
|---|---|---|---|---|
| 1 | Fundacao (banco + UI gestao + brecha `tecnico`) | DB/FRONT | - | **ENTREGUE** |
| 2 | Catalogo granular Demutran/Guarda (seed) | DB | Fase 1 | A fazer |
| 3 | Adocao granular no frontend (menu + rotas) | FRONT | Fase 2 | A fazer |
| 4 | Auditoria de divergencia (prova de zero regressao) | DB | Fases 2 e 3 | A fazer |
| 5 | Homologacao por setor (validacao funcional) | NEGOCIO | Fase 4 | A fazer |
| 6 | Ligar a flag + monitoramento + rollback | DB/OPS | Fase 5 | A fazer |
| 7 | (Futuro) Reescrever motor JGC para o catalogo v2 | DB | fora de escopo | Futuro |

**Resumo:** 4 fases de codigo/execucao imediata (2, 3, 4, 6) + 1 de validacao com os setores (5) + 1 futura (7).

### 1.1 Regras de ouro (nao quebrar)

- **Flag `permissions_v2.enabled` continua `false`** ate a Fase 6. Com ela off, `tem_permissao` == `legacy_tem_permissao` (100% comportamento atual).
- **Nunca remover acesso que o usuario ja tinha** (regra do passo 5 do `tem_permissao`): novo motor e aditivo sobre o legado.
- **JGC intocado** (rotas `jgc_*`, `allowedJgcPerfis`, `jgc_perfil`, menu JGC, motor `jgc_tem_permissao`).
- Rotas `requireGuarda` (fluxo pessoal) e rotas de Ordem de Servico **nao** recebem `requisitoPermissao`.
- Zero novos erros de `tsc`/eslint.

### 1.2 Estado entregue (Fase 1)

- DB: `setor_modulos` (22), `permissoes_sistema` (26 so JGC), `perfis_funcionais`, `perfil_funcional_permissoes`, `usuario_permissoes`, `perfis_usuarios.perfil_funcional_id`, flag `permissions_v2.enabled=false`, RPCs `tem_permissao`/`legacy_tem_permissao`/`get_usuario_permissoes`/`provision_admin_user`/`set_usuario_perfil_funcional`/`upsert_usuario_permissao`/`remove_usuario_permissao`.
- Frontend: UI `Usuarios.tsx` (perfil funcional + excecoes Demutran/Guarda), brecha `tecnico` corrigida (`requiredModule` no `ProtectedRoute`, 12 rotas mapeadas em `App.tsx`), hooks `usePermission`/`usePermissions`, `clearPermissionCache` no `AuthContext`.

### 1.3 Descoberta critica (motiva a Fase 2)

So existem codigos `jovem_guarda.*` no catalogo. `tem_permissao` para usuario **migrado** (com `perfil_funcional_id`) e codigo **nao catalogado** retorna `false` (linhas 353-355 do `20260805130000`). Ou seja: sem codigos `demutran.*`/`guarda.*`, migrar um usuario Demutran/Guarda e ligar a flag o **bloquearia**. Por isso a Fase 2 vem antes.

---

## 2. FASE 2 - Catalogo granular Demutran/Guarda (seed)

**Arquivo:** `supabase/migrations/20260806010000_permissions_v2_codes_demutran_guarda.sql`

### 2.1 Schema de destino (`permissoes_sistema`)

`id uuid PK` | `modulo_id` FK `setor_modulos(id)` | `codigo text UNIQUE` | `nome` | `descricao` | `acao` (`visualizar/criar/editar/inativar/excluir`) | `sensivel bool` | `ativo bool`

**Nomenclatura:** `<setor>.<modulo>.<acao>` com nome **semantico** do modulo (padrao JGC: `jovem_guarda.alunos.visualizar`), ex.: `guarda_municipal.escalas.visualizar`.

### 2.2 Por que nao usar o padrao de JOIN do seed JGC

O seed `1400` faz `JOIN ON m.prefixo = sm.prefixo`. O prefixo `midias` existe em **Demutran e Guarda**; como `codigo` e UNIQUE global, o INSERT da Fase 2 deve resolver por **`setor.slug` + `setor_modulos.slug`**.

### 2.3 Migration pronta

```sql
-- =====================================================
-- Permissions V2 - Seed codigos granulares Demutran/Guarda
-- Fase 2. Nao altera comportamento (flag ainda off).
-- Reversivel: DELETE ... WHERE codigo LIKE 'demutran.%' OR 'guarda_municipal.%'
-- =====================================================
INSERT INTO public.permissoes_sistema (modulo_id, codigo, nome, descricao, acao, sensivel, ativo)
SELECT sm.id, m.codigo, m.codigo, m.descricao, m.acao, m.sensivel, true
FROM public.setor_modulos sm
JOIN public.setores s ON s.id = sm.setor_id
JOIN (
  VALUES
    -- ---- Demutran (24) ----
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
    -- ---- Guarda Municipal (26) ----
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

### 2.4 Verificacoes apos aplicar

```sql
SELECT count(*) FROM public.permissoes_sistema WHERE ativo;                          -- 76 (26 JGC + 50)
SELECT codigo, count(*) FROM public.permissoes_sistema GROUP BY codigo HAVING count(*)>1; -- 0
SELECT sm.slug, ps.codigo, ps.acao, ps.sensivel
FROM public.permissoes_sistema ps
JOIN public.setor_modulos sm ON sm.id = ps.modulo_id
WHERE sm.setor_id = (SELECT id FROM public.setores WHERE slug='guarda-municipal')
ORDER BY sm.slug, ps.acao;                                                            -- 26 linhas
```

### 2.5 Criterio de aceite

- [ ] 76 permissoes ativas, zero codigo duplicado.
- [ ] `get_usuario_permissoes` lista modulos Demutran e Guarda.
- [ ] Perfil funcional "Teste Demutran" criado via UI e `tem_permissao('demutran.veiculos.visualizar')` coerente (flag off -> legado).

### 2.6 Rollback

```sql
DELETE FROM public.permissoes_sistema WHERE codigo LIKE 'demutran.%' OR codigo LIKE 'guarda_municipal.%';
```

---

## 3. FASE 3 - Adocao granular no frontend (menu + rotas)

**Depende da Fase 2.** Com a flag off, `tem_permissao` == legado, entao e seguro trocar o gate de modulo legado pelo codigo granular **já hoje** (sem mudanca de comportamento).

### 3.0 Expor `perfil_funcional_id` no profile

**Arquivo:** `supabase/migrations/20260806020000_expose_perfil_funcional_id.sql`

`get_user_profile()` (definicao atual em `20260728000002`) passa a retornar `pu.perfil_funcional_id`. Alterar o SELECT de `profile_row` (linha ~25-36) adicionando `pu.perfil_funcional_id`, e adicionar `'perfil_funcional_id', profile_row.perfil_funcional_id` (e `NULL` nos 2 branches de retorno sem perfil). Migration pronta no anexo A.

`src/types/admin.ts` — `AdminProfile` (apos linha 82):

```ts
perfil_funcional_id?: string | null;
```

### 3.1 Helper de codigos

**Novo arquivo:** `src/lib/adminPermissions.ts` (esqueleto no anexo B). Mapeia `ModuloSistema -> codigo.visualizar`, com tratamento do `midias` ambiguo (Demutran x Guarda) via `codigoVisualizarModulo(setorSlug, modulo)`.

### 3.2 `usePermissionStatus` (evita flash de redirect)

Adicionar em `src/hooks/usePermission.ts` (esqueleto no anexo C): retorna `{ resolved, allowed }`; enquanto `resolved=false`, a guarda de rota **nao** redireciona (renderiza spinner).

### 3.3 Gate de menu no `AdminLayout.tsx`

Substituir o bloco `hasModulosRestricted`/`moduloItemMap` (linhas 499-504) por checagem granular com fallback legado:

```tsx
// no corpo do componente (depois de sectorContext/profile):
const modulosDoSetor = MODULOS_POR_SETOR[sectorContext as keyof typeof MODULOS_POR_SETOR] ?? [];
const codigosMenu = modulosDoSetor
  .map((m) => codigoVisualizarModulo(profile?.setor_slug, m.value))
  .filter((c): c is string => !!c);
const permissoesMenu = usePermissions(codigosMenu);

// no filterItem:
if (hasModulosRestricted) {
  const modulo = moduloItemMap[mappedItem.label];
  if (modulo) {
    const codigo = codigoVisualizarModulo(profile?.setor_slug, modulo);
    const granularOk = codigo ? permissoesMenu[codigo] : undefined;
    if (granularOk === true) return mappedItem;
    if (granularOk === false) return null;
    return hasStoredModule(userModulos, modulo) ? mappedItem : null; // nao resolvido -> legado
  }
}
```

Repetir em `searchableItems` (`filterByPapel`, linhas 609-614). **Nao mexer** no fluxo JGC. Adicionar `permissoesMenu` nas deps dos `useMemo`.

### 3.4 Rotas: `requisitoPermissao` no `ProtectedRoute.tsx` + `App.tsx`

**ProtectedRoute:** nova prop `requisitoPermissao?: string`, usar `usePermissionStatus`. Enquanto `!resolved`, renderizar spinner. Fallback de `tecnico`:

```tsx
: hasPapel(...allowedPapeis) ||
  (profile?.papel === 'tecnico' &&
    (requisitoPermissao
      ? permissaoPermitida
      : requiredModule
        ? hasStoredModule((profile?.modulos as ModuloSistema[]) ?? [], requiredModule)
        : !!profile?.modulos?.length));
```

**App.tsx** — trocar `requiredModule` por `requisitoPermissao` (12 rotas):

| Rota | novo `requisitoPermissao` |
|---|---|
| `/admin/fiscalizacao/infracoes`, `/:codigo`, `/admin/fiscalizacao/categorias` | `guarda_municipal.fiscalizacao.visualizar` |
| `/admin/iros/guarda-municipal/minhas-iro`, `/*` | `guarda_municipal.iros.visualizar` |
| `/admin/guardas/guarda-municipal` | `guarda_municipal.guardas.visualizar` |
| `/admin/guardas/guarda-municipal/frota*` (4 rotas) | `guarda_municipal.frota.visualizar` |
| `/admin/guardas/guarda-municipal/equipes` | `guarda_municipal.equipes.visualizar` |
| `/admin/guardas/guarda-municipal/escalas/*` | `guarda_municipal.escalas.visualizar` |

**NAO aplicar** em: rotas `jgc_*`, `/admin/*/ordens-servico` (sem catalogo), rotas `requireGuarda`.

### 3.5 Verificacao da Fase 3

```bash
npx eslint src/components/admin/AdminLayout.tsx src/components/admin/ProtectedRoute.tsx src/App.tsx src/hooks/usePermission.ts src/lib/adminPermissions.ts
npx tsc -b   # comparar com erros pre-existentes (sec. 8 do documento-mestre)
```

Teste: usuario nao-migrado -> menu/rotas identicos ao de hoje; super admin -> bypass total.

---

## 4. FASE 4 - Auditoria de divergencia (prova de zero regressao)

**Objetivo:** comparar `legacy_tem_permissao` x `tem_permissao` para **cada usuario real x cada codigo do catalogo**, com a flag ainda `false`, e garantir zero divergencia antes da Fase 6.

### 4.1 Por que precisa de um RPC dedicado

`tem_permissao` e `legacy_tem_permissao` usam `auth.uid()` (le `request.jwt.claim.sub`). Rodando como super admin, ambas retornam `true` para tudo. A auditoria precisa **impersonar** cada usuario durante a comparacao — padrao Supabase via `set_config('request.jwt.claims', ...)` (mesmo mecanismo usado pelo realtime interno).

### 4.2 RPC de auditoria

**Arquivo:** `supabase/migrations/20260806030000_permissions_v2_audit.sql`

```sql
-- Auditoria: compara motor novo x legado PARA CADA USUARIO (impersonacao).
CREATE OR REPLACE FUNCTION public.auditar_permissoes_v2(p_setor_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid, email text, setor_slug text, papel text,
  codigo text, resultado_legado boolean, resultado_novo boolean, divergiu boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claims_original text := nullif(current_setting('request.jwt.claims', true), '');
  v_user RECORD;
  v_perm RECORD;
  v_legado boolean;
  v_novo boolean;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Somente super admin pode executar a auditoria.';
  END IF;

  FOR v_user IN
    SELECT au.id AS user_id, au.email, s.slug AS setor_slug, pu.papel::text AS papel
    FROM public.perfis_usuarios pu
    JOIN auth.users au ON au.id = pu.user_id
    JOIN public.setores s ON s.id = pu.setor_id
    WHERE pu.ativo AND s.ativo
      AND (p_setor_id IS NULL OR s.id = p_setor_id)
    ORDER BY s.slug, au.email
  LOOP
    PERFORM set_config(
      'request.jwt.claims',
      jsonb_build_object('sub', v_user.user_id::text, 'role', 'authenticated')::text,
      true
    );

    FOR v_perm IN
      SELECT codigo FROM public.permissoes_sistema WHERE ativo ORDER BY codigo
    LOOP
      v_legado := public.legacy_tem_permissao(v_perm.codigo);
      v_novo   := public.tem_permissao(v_perm.codigo);
      user_id          := v_user.user_id;
      email            := v_user.email;
      setor_slug       := v_user.setor_slug;
      papel            := v_user.papel;
      codigo           := v_perm.codigo;
      resultado_legado := v_legado;
      resultado_novo   := v_novo;
      divergiu         := (v_legado IS DISTINCT FROM v_novo);
      RETURN NEXT;
    END LOOP;
  END LOOP;

  PERFORM set_config('request.jwt.claims', coalesce(v_claims_original, ''), true);
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('request.jwt.claims', coalesce(v_claims_original, ''), true);
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auditar_permissoes_v2(uuid) TO authenticated;
```

> **Nota:** com a flag off, `tem_permissao` delega a `legacy_tem_permissao` (linha 320 do core) — entao `divergiu` deve ser `false` para tudo. Se aparecer divergencia, e bug de configuracao/flag.

### 4.3 Execucao e criterios

```sql
-- Todos os setores (esperado: 0 linhas de divergencia)
SELECT count(*) FILTER (WHERE divergiu) AS total_divergencias,
       count(*) AS total_checagens
FROM public.auditar_permissoes_v2();

-- Por setor (diagnostico)
SELECT setor_slug, count(*) FILTER (WHERE divergiu) AS div
FROM public.auditar_permissoes_v2()
GROUP BY setor_slug HAVING count(*) FILTER (WHERE divergiu) > 0;

-- Spot-check de um usuario (ex.: email especifico)
SELECT * FROM public.auditar_permissoes_v2()
WHERE email = 'fulano@provedor.com' AND divergiu;

-- Tabela de log de divergencias da Fase 1: conferir se ha registros
SELECT count(*) FROM public.permissoes_divergencia_log;
```

- [ ] Zero divergencias no setor JGC (o mais critico — motor proprio `jgc_tem_permissao` delegado).
- [ ] Zero divergencias Demutran/Guarda.
- [ ] `get_usuario_permissoes` com `origem` correto (`catalogo`/`perfil_funcional`/`excecao`) para os perfis de teste criados na Fase 2.

### 4.4 Rollback

`DROP FUNCTION public.auditar_permissoes_v2(uuid);`

---

## 5. FASE 5 - Homologacao por setor (validacao funcional)

**Bloqueia a Fase 6.** Flag continua `false`; usa-se a UI nova (`Usuarios.tsx`) para preparar perfis.

### 5.1 Preparacao (super admin / gestores)

Criar via `Usuarios.tsx` os perfis funcionais iniciais (nao produtivos, em homologacao) e vincular a usuarios de teste migrados:

- **Demutran:** "Operador de Veiculos" (visualizar+criar+editar de `veiculos`), "Editor de Conteudo" (`midias`+`documentos`), "Operador de Recolhimento" (`veiculos`+`frota`).
- **Guarda:** "Operador de IROs" (`iros`), "Gestor de Escala" (`escalas`), "Operador de Fiscalizacao" (`fiscalizacao`), "Frota" (`frota`), "Equipes" (`equipes`).
- Configurar excecoes individuais (PERMITIR/NEGAR + motivo) para testar o tri-estado.

### 5.2 Checklist funcional por setor

**JGC:**
- [ ] 26 permissoes cobrem o fluxo (alunos, responsaveis, turmas, frequencia, atividades, acompanhamento, relatorios).
- [ ] Chamada de frequencia restrita a professor (`20260804010000`).

**Demutran:**
- [ ] Menu reflete o perfil funcional (sem itens de modulos sem permissao).
- [ ] Rotas bloqueiam `tecnico` sem o modulo (`requiredModule`/`requisitoPermissao`).
- [ ] Excecoes NEGAR removem item de menu / acesso.

**Guarda:**
- [ ] Idem Demutran para IROs, guardas, escalas, frota, equipes, fiscalizacao.
- [ ] Fluxo pessoal do guarda (`requireGuarda`) intacto.

**Transversais:**
- [ ] super_admin bypass total.
- [ ] gestor/admin_setor com acesso pleno do setor (nao passam por checagem granular).
- [ ] Login/logout entre contas distintas valida `clearPermissionCache` (menu nao vaza permissao da conta anterior).
- [ ] Nenhum erro de console/network.

### 5.3 Ajuste fino

Se a homologacao revelar codigos faltantes, adicionar via **nova migration incremental** (nunca editar a 06010000 ja aplicada) seguindo o mesmo padrao `ON CONFLICT DO NOTHING`.

---

## 6. FASE 6 - Ligar a flag e monitorar

### 6.1 Ligar

```sql
-- Confirmar que a homologacao (Fase 5) foi aprovada e a auditoria (Fase 4) zerou divergencias.
UPDATE public.configuracoes
SET config = '{"enabled": true}', updated_at = now()
WHERE grupo = 'permissions_v2' AND tipo = 'enabled'
RETURNING *;

-- Conferir
SELECT config FROM public.configuracoes
WHERE grupo = 'permissions_v2' AND tipo = 'enabled';
```

Preferir horario de baixo uso. Apos ligar, o motor passa a usar catalogo/perfil/excecoes **apenas para usuarios migrados** (os demais seguem legado pelo passo 5 do `tem_permissao`).

### 6.2 Monitoramento (48h)

```sql
-- Divergencias/erros novos no log
SELECT * FROM public.permissoes_divergencia_log
WHERE criado_em > now() - interval '48 hours' ORDER BY criado_em DESC LIMIT 50;

-- Usuarios migrados (esperado: apenas os homologados)
SELECT pu.id, au.email, s.slug, pf.nome AS perfil_funcional
FROM public.perfis_usuarios pu
JOIN auth.users au ON au.id = pu.user_id
JOIN public.setores s ON s.id = pu.setor_id
LEFT JOIN public.perfis_funcionais pf ON pf.id = pu.perfil_funcional_id
WHERE pu.perfil_funcional_id IS NOT NULL;
```

### 6.3 Rollback (imediato)

```sql
UPDATE public.configuracoes
SET config = '{"enabled": false}', updated_at = now()
WHERE grupo = 'permissions_v2' AND tipo = 'enabled';
```

Com a flag `false`, `tem_permissao` volta 100% ao legado. **Nenhuma migration precisa ser revertida.** Usuarios migrados sem NEGAR explicito ja mantem acesso pelo passo 5 (compatibilidade legada).

### 6.4 Criterio de aceite

- [ ] Setores validaram que acesso segue identico apos ligar a flag.
- [ ] Nenhuma divergencia no log nas 48h.
- [ ] Rollback documentado e testado (flag off e back to normal).

---

## 7. FASE 7 - (Futuro) Reescrever o motor JGC

Hoje `tem_permissao` delega codigos `jovem_guarda.%` a `jgc_tem_permissao`. Fase futura: migrar o JGC para usar exclusivamente catalogo/perfil/excecoes do motor v2, mantendo a UI de gestao JGC atual (decisao do usuario). Fora do escopo imediato; nao iniciar antes da Fase 6 estabilizada.

---

## 8. Pendencias operacionais (nao-codigo)

1. **Aplicar no remoto** (via SQL Editor) as migrations ja existentes que nao estao entre as 3 da Fase 1:
   - `20260805120000_setor_pagina_publica.sql`
   - `20260806000000_guarda_graduacao_data_historico.sql`
2. **Reconciliar `schema_migrations`** (remoto 137 vs repo 178): aplicar via SQL Editor registra fora do historico. Decidir com `supabase db push` (exige Docker, nao instalado) ou documentar a divergencia.
3. **Revogar o token CLI `sbp_1c59cd2...`** exposto no chat (nao salvo no repo).
4. **Erros `tsc -b` pre-existentes** (nao causados pelas fases v2): `AdminLayout.tsx:502/612`, `JgcStudentJourney.tsx:35`, `MinhasEscalasPage.tsx:103`, `Dashboard.tsx:953/954`, `guarda/Dashboard.tsx:450/492`, `OrdensServicoPage.tsx:512/514`, `JovemGuardaCidada.tsx:200/751`, `pdfJovemGuarda.ts:79`.

---

## 9. Checklist de retomada

1. `git branch --show-current` (develop), `git status` limpo, `git log --oneline -3`.
2. Remoto: flag `false`; 22 `setor_modulos`; 26 `permissoes_sistema`; migrations `1200` e `0600` aplicadas.
3. `npx eslint` + `npx tsc -b` comparado com a secao 8.
4. Aplicar Fase 2 -> verificar -> Fase 3 (3.0+3.1..3.4) -> Fase 4 -> Fase 5 (com setores) -> Fase 6.
5. Commit de cada fase em develop com mensagem `feat(permissoes-v2): <fase>`.

---

## Anexo A - Migration completa da Fase 3.0 (expor perfil_funcional_id)

Ver secao 3.0. A definicao atual de `get_user_profile()` esta em `20260728000002_add_jgc_perfil_to_get_user_profile.sql`; a nova migration replica a funcao inteira com `pu.perfil_funcional_id` adicionado ao SELECT e `perfil_funcional_id` nos 3 retornos jsonb (anexo ja detalhado em `PERMISSOES_V2_FASES_2_E_3_DETALHADO.md`, secao 3.0).

## Anexo B - `src/lib/adminPermissions.ts`

```ts
import type { ModuloSistema } from '@/types/admin';
import { MODULOS_POR_SETOR } from '@/types/admin';

const CODIGO_VISUALIZAR_POR_MODULO: Partial<Record<ModuloSistema, string>> = {
  veiculos: 'demutran.veiculos.visualizar',
  concessionarios: 'demutran.concessionarios.visualizar',
  credenciais: 'demutran.credenciais.visualizar',
  recursos: 'demutran.recursos.visualizar',
  frota: 'demutran.frota.visualizar',
  documentos: 'demutran.documentos.visualizar',
  iros: 'guarda_municipal.iros.visualizar',
  guardas: 'guarda_municipal.guardas.visualizar',
  guarda_escalas: 'guarda_municipal.escalas.visualizar',
  guarda_frota: 'guarda_municipal.frota.visualizar',
  guarda_equipes: 'guarda_municipal.equipes.visualizar',
  fiscalizacao: 'guarda_municipal.fiscalizacao.visualizar',
};

export function codigoVisualizarModulo(setorSlug: string | null | undefined, modulo: ModuloSistema): string | null {
  if (modulo === 'midias') {
    if (setorSlug === 'demutran') return 'demutran.midias.visualizar';
    if (setorSlug === 'guarda-municipal') return 'guarda_municipal.midias.visualizar';
    return null;
  }
  return CODIGO_VISUALIZAR_POR_MODULO[modulo] ?? null;
}

export function codigosVisualizarDoSetor(setorSlug: string | null | undefined): string[] {
  const modulos = MODULOS_POR_SETOR[setorSlug ?? ''] ?? [];
  return modulos
    .map((m) => codigoVisualizarModulo(setorSlug, m.value))
    .filter((c): c is string => !!c);
}
```

## Anexo C - `usePermissionStatus` (adicionar em `src/hooks/usePermission.ts`)

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
