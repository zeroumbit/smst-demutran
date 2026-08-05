# Permissoes V2 - Proximas Fases (Plano de Continuidade)

> **Projeto:** SITE-SMST
> **Data:** 2026-08-05
> **Branch:** develop
> **Objetivo:** Detalhar o que ja foi entregue (Fase 1) e o passo a passo tecnico das proximas fases (2 a 7) para retomada no dia seguinte, com checklists executaveis.

---

## 1. Resumo do estado atual (entregue na Fase 1)

### 1.1 Banco de dados (migrations v2 aplicadas no remoto via SQL Editor)

| Migration | Conteudo |
|---|---|
| `20260805130000_permissions_v2_core.sql` | Tabelas `setor_modulos`, `permissoes_sistema`, `perfis_funcionais`, `perfil_funcional_permissoes`, `usuario_permissoes`, `perfis_usuarios.perfil_funcional_id`, flag `permissions_v2.enabled`, `tem_permissao`, `legacy_tem_permissao`, `get_usuario_permissoes` (parte) |
| `20260805140000_permissions_v2_seed.sql` | 22 `setor_modulos` (7 Demutran + 7 Guarda + 8 JGC) e 26 `permissoes_sistema` **somente JGC** (`jovem_guarda.*`) |
| `20260805150000_permissions_v2_admin_management.sql` | RPCs `provision_admin_user` (11 params), `set_usuario_perfil_funcional`, `upsert_usuario_permissao`, `remove_usuario_permissao`, `get_usuario_permissoes` |

Estado no remoto: `permissions_v2.enabled = false` (flag unica desligada — motor legado 100% ativo).

### 1.2 Frontend (entregue na Fase 1)

- **UI de gestao de usuarios** (`src/pages/admin/Usuarios.tsx`): perfil funcional + excecoes individuais **somente Demutran/Guarda** (JGC mantem editor proprio). Tri-estado (Sem excecao / PERMITIR / NEGAR + motivo), painel "Revisao de acessos" colapsavel, badge Sensivel.
- **Brecha de `tecnico` corrigida** em `src/components/admin/ProtectedRoute.tsx`: nova prop `requiredModule?: ModuloSistema`; `tecnico` agora exige o **modulo especifico** da rota (via `hasStoredModule`, mesmo helper do menu) em vez de "qualquer modulo". Aplicado em `src/App.tsx` nas rotas Guarda com `tecnico`: fiscalizacao (`fiscalizacao`), IROs (`iros`), guardas (`guardas`), frota (`guarda_frota`), equipes (`guarda_equipes`), escalas (`guarda_escalas`). Gestor/admin_setor/super_admin inalterados.
- **Hooks prontos, ainda sem uso:** `src/hooks/usePermission.ts` (`usePermission`, `usePermissions`) e `src/lib/permissions.ts` (`hasPermissionRpc` com cache, `clearPermissionCache`).
- **Cache limpo ao trocar de usuario:** `clearPermissionCache()` em `AuthContext.tsx` `processSession`.
- ESLint limpo; `tsc -b` somente com erros pre-existentes (lista na secao 8).

### 1.3 Descoberta critica (motiva a Fase 2)

`permissoes_sistema` hoje **so contem codigos `jovem_guarda.*`**. Consequencia no motor `tem_permissao` (`20260805130000`, linhas ~300-381):

```sql
-- Usuario migrado (tem perfil_funcional_id) + codigo NAO catalogado => FALSE
IF v_permissao.id IS NULL THEN
  RETURN false;
END IF;
```

Ou seja: **enquanto nao existirem codigos `demutran.*`/`guarda.*` no catalogo, um usuario Demutran/Guarda migrado perde o acesso ao ligar a flag**. A adocao granular de menu/rota so pode acontecer depois da Fase 2. Por isso hoje as rotas foram protegidas com o modulo **legado** (independente da flag), nao com `usePermission`.

---

## 2. Fase 2 - Seed dos codigos granulares Demutran/Guarda

**Objetivo:** popular `permissoes_sistema` com os codigos dos modulos Demutran/Guarda para que perfis funcionais e excecoes tenham efeito real quando a flag ligar, e para o painel "Revisao de acessos" (`get_usuario_permissoes`) listar esses modulos.

### 2.1 Problema de colisao a resolver

Em `setor_modulos` o prefixo `midias` existe em **Demutran e Guarda** (linhas 40 e 47 do seed 1400). O INSERT do seed JGC faz `JOIN ... ON m.prefixo = sm.prefixo` — esse padrao **nao serve** para Demutran/Guarda (geraria colisao/duplicidade). A nova migration deve resolver o modulo por `setor_id + slug`, nao so pelo prefixo.

### 2.2 Codigos sugeridos (formato `<setor>.<modulo>.<acao>`)

Regra de sensibilidade seguindo o padrao JGC: `true` para acoes destrutivas/irreversiveis (excluir, inativar, editar frequencia/registros).

**Demutran (7 modulos):**
| Modulo | Codigos |
|---|---|
| veiculos | `demutran.veiculos.visualizar`, `.criar`, `.editar`, `.inativar` |
| concessionarios | `demutran.concessionarios.visualizar`, `.criar`, `.editar` |
| credenciais | `demutran.credenciais.visualizar`, `.criar`, `.editar` |
| recursos | `demutran.recursos.visualizar`, `.criar`, `.editar`, `.excluir` |
| frota | `demutran.frota.visualizar`, `.criar`, `.editar` |
| documentos | `demutran.documentos.visualizar`, `.criar`, `.editar` |
| midias | `demutran.midias.visualizar`, `.criar`, `.editar`, `.excluir` |

**Guarda Municipal (7 modulos):**
| Modulo | Codigos |
|---|---|
| iros | `guarda_municipal.iros.visualizar`, `.criar`, `.editar` |
| guardas | `guarda_municipal.guardas.visualizar`, `.criar`, `.editar`, `.inativar` |
| guarda_escalas | `guarda_municipal.escalas.visualizar`, `.criar`, `.editar` |
| guarda_frota | `guarda_municipal.frota.visualizar`, `.criar`, `.editar` |
| guarda_equipes | `guarda_municipal.equipes.visualizar`, `.criar`, `.editar` |
| fiscalizacao | `guarda_municipal.fiscalizacao.visualizar`, `.criar`, `.editar`, `.excluir` |
| midias | `guarda_municipal.midias.visualizar`, `.criar`, `.editar`, `.excluir` |

### 2.3 Esqueleto da migration

Novo arquivo: `supabase/migrations/20260806XXXX00_permissions_v2_codes_demutran_guarda.sql`

```sql
-- Resolve o modulo do setor correto (evita colisao do prefixo 'midias')
INSERT INTO public.permissoes_sistema (modulo_id, codigo, nome, descricao, acao, sensivel, ativo)
SELECT sm.id, m.codigo, m.nome, m.descricao, m.acao, m.sensivel, true
FROM public.setor_modulos sm
JOIN public.setores s ON s.id = sm.setor_id
JOIN (
  VALUES
    ('demutran', 'veiculos', 'demutran.veiculos.visualizar', 'Visualizar veiculos', 'visualizar', false),
    ...
    ('guarda-municipal', 'midias', 'guarda_municipal.midias.excluir', 'Excluir midias', 'excluir', true)
) AS m(setor_slug, modulo_slug, codigo, nome, descricao, acao, sensivel)
  ON m.setor_slug = s.slug AND m.modulo_slug = sm.slug
ON CONFLICT (codigo) DO NOTHING;
```

### 2.4 Verificacao apos aplicar

```sql
-- Deve retornar 26 (JGC) + ~45 (Demutran/Guarda) = ~71
SELECT count(*) FROM public.permissoes_sistema WHERE ativo;
-- Zero colisoes de codigo
SELECT codigo, count(*) FROM public.permissoes_sistema GROUP BY codigo HAVING count(*) > 1;
-- Painel de revisao deve listar modulos Demutran/Guarda agora:
SELECT sm.slug, ps.codigo FROM public.permissoes_sistema ps
JOIN public.setor_modulos sm ON sm.id = ps.modulo_id
WHERE sm.setor_id = (SELECT id FROM public.setores WHERE slug='guarda-municipal')
ORDER BY sm.slug, ps.acao;
```

---

## 3. Fase 3 - Adocao granular no frontend (depende da Fase 2)

**Objetivo:** menu e rotas passarem a refletir a permissao granular **so para usuarios migrados** (com `perfil_funcional_id`), mantendo o legado para os demais.

### 3.1 Gate de menu no `AdminLayout.tsx` (`visibleMenuItems`, ~linhas 436-525)

O bloco `hasModulosRestricted`/`moduloItemMap`/`hasStoredModule` hoje filtra por modulo legado para Demutran/Guarda. Adicionar camada granular antes:

```tsx
// Se o usuario tem perfil funcional (migrado), usa usePermissions com os codigos do setor;
// senao, cai no legado atual. NUNCA remove acesso que o usuario ja tinha (mesma regra do tem_permissao).
const permissoes = usePermissions(usuarioMigrado ? codigosDoSetor : []);
// item visivel se: super_admin | hasPapel | (migrado ? tem_permissao(visualizar) : moduloItemMap legado)
```

- Codigos a consultar: `MODULOS_POR_SETOR` (`src/types/admin.ts`) -> `demutran.X.visualizar` / `guarda_municipal.X.visualizar` (apos Fase 2).
- **Cuidado:** nao alterar o fluxo JGC (`sectorContext === 'jovem-guarda'` usa `allowedJgcPerfis` + `jgc_perfil`). JGC fica como esta.

### 3.2 Rotas - `ProtectedRoute.tsx` + `App.tsx`

Estender o `ProtectedRoute` com `requisitoPermissao?: string` (codigo granular), **em paralelo** ao `requiredModule` legado ja criado:

- Resolucao **async** via `usePermission(requisitoPermissao)`; enquanto nao resolveu (`resolved === false`), renderizar spinner e **nao** redirecionar (evitar flash de logout).
- Super admin bypass.
- Aplicar somente em rotas Demutran/Guarda. **Nao** aplicar em rotas JGC (`jgc_*`) nem em `/admin/iros/...minhas-iro` (fluxo pessoal do guarda).

### 3.3 Registro das decisoes ja tomadas

- Demutran/Guarda: perfil funcional + excecoes **somente** via UI de `Usuarios.tsx`.
- JGC: mantem editor e motor proprios (`jgc_tem_permissao`); nao migrar rotas JGC.

---

## 4. Fase 4 - Auditoria de divergencia (antes de ligar a flag)

**Objetivo:** provar zero regressao comparando `legacy_tem_permissao` x `tem_permissao` para cada usuario/codigo JGC real, com a flag ainda desligada.

1. Rodar no remoto, para cada perfil JGC ativo e cada codigo do catalogo JGC:
   ```sql
   -- Confirma que com flag off o novo motor delega 100% ao legado
   SELECT public.tem_permissao(c.codigo) = public.legacy_tem_permissao(c.codigo) AS equivalente
   FROM public.permissoes_sistema c WHERE c.ativo;
   ```
2. Conferir a tabela `public.permissoes_divergencia_log` (que registra diferencas) e zerar divergencias antes da Fase 6.
3. Conferir, para os perfis funcionais criados em testes, que `get_usuario_permissoes` retorna `origem` correto (`catalogo`/`perfil_funcional`/`excecao`) e `pode` coerente.

---

## 5. Fase 5 - Homologacao por setor (bloqueia ligar a flag)

Checklist funcional a validar com cada setor, com flag ainda `false` mas usando a UI nova:

- [ ] **JGC:** as 26 permissoes cobrem o fluxo (alunos, responsaveis, turmas, frequencia, atividades, acompanhamento, relatorios). Conferir restricao de chamada somente professor (`20260804010000`).
- [ ] **Demutran:** criar perfis funcionais reais (ex.: "Operador de Veiculos", "Editor de Conteudo"), definir excecoes (PERMITIR/NEGAR + motivo), conferir menu e rotas para um usuario migrado e outro nao-migrado.
- [ ] **Guarda:** idem (ex.: "Operador de IROs", "Escala", "Frota").
- [ ] Cenarios: super_admin, gestor, admin_setor, `tecnico` com modulos legados (validar a nova checagem `requiredModule`), guarda com perfil pessoal (`requireGuarda`).
- [ ] Logout/login alternando usuarios distintos (validar `clearPermissionCache`).

---

## 6. Fase 6 - Ligar a flag e monitorar

- Ligar: `UPDATE ... SET value = 'true' WHERE key = 'permissions_v2.enabled'` (ou migration propria), em horario de baixo uso.
- **Rollback imediato:** voltar a flag para `false` — o motor `tem_permissao` volta 100% ao legado; nenhuma migration precisa ser revertida.
- Monitorar `permissoes_divergencia_log` e relatos de setor nas 48h seguintes.

---

## 7. Fase 7 - (futuro, fora do escopo de amanha) Reescrita do motor JGC

Hoje `tem_permissao` delega codigos `jovem_guarda.%` para `jgc_tem_permissao`. A reescrita do motor JGC para usar exclusivamente o catalogo v2 + perfil/excecoes e fase futura — mantendo a UI de gestao JGC atual por decisao.

---

## 8. Pendencias operacionais (nao-codigo)

1. **Aplicar no remoto** (via SQL Editor, nao sao as 3 da Fase 1):
   - `20260805120000_setor_pagina_publica.sql`
   - `20260806000000_guarda_graduacao_data_historico.sql`
2. **Reconciliar `schema_migrations`** (remoto 137 vs repo 178): as 3 migrations v2 foram aplicadas por SQL Editor. Decidir: `supabase db push` (requer Docker, nao instalado no ambiente) ou registrar a divergencia explicitamente.
3. **Revogar o token CLI `sbp_1c59cd2...`** exposto no chat (nao salvo no repo).
4. **Erros `tsc -b` pre-existentes** (nao causados pelas fases v2): `AdminLayout.tsx:502/612`, `JgcStudentJourney.tsx:35`, `MinhasEscalasPage.tsx:103`, `Dashboard.tsx:953/954`, `guarda/Dashboard.tsx:450/492`, `OrdensServicoPage.tsx:512/514`, `JovemGuardaCidada.tsx:200/751`, `pdfJovemGuarda.ts:79`.

---

## 9. Checklist de retomada (amanha, inicio da sessao)

1. `git status`/`git log` em `develop` — confirmar commit da Fase 1.
2. Conferir no remoto: flag `permissions_v2.enabled = false`; 22 `setor_modulos`; 26 `permissoes_sistema`; migrations 1200 e 0600 aplicadas.
3. Rodar `npx eslint` + `npx tsc -b` e comparar com a lista da secao 8 (nenhum erro novo).
4. Iniciar a **Fase 2** (seed de codigos Demutran/Guarda) e aplicar no remoto.
5. Prosseguir para a Fase 3 (adocao granular), depois 4/5/6.

---

## 10. Arquivos-chave para referencia

| Arquivo | Papel |
|---|---|
| `supabase/migrations/20260805130000_permissions_v2_core.sql` | Motor (`tem_permissao` linha 300, `legacy_tem_permissao` linha 232, flag) |
| `supabase/migrations/20260805140000_permissions_v2_seed.sql` | `setor_modulos` (linha 29) e seed JGC (linha 65) |
| `supabase/migrations/20260805150000_permissions_v2_admin_management.sql` | RPCs de gestao |
| `src/components/admin/ProtectedRoute.tsx` | `requiredModule` (feito); `requisitoPermissao` (Fase 3) |
| `src/App.tsx` | `requiredModule` nas rotas Guarda |
| `src/components/admin/AdminLayout.tsx` | Gate de menu legado (Fase 3) |
| `src/hooks/usePermission.ts` | `usePermission`/`usePermissions` (prontos, sem uso) |
| `src/lib/permissions.ts` | `hasPermissionRpc` + cache |
| `src/pages/admin/Usuarios.tsx` | UI de gestao (concluida) |
| `src/types/admin.ts` | `ModuloSistema` (linha 3), `MODULOS_POR_SETOR` (linha 59) |
