# Padrão Mobile — Telas Administrativas

## Estrutura Geral

```
┌──────────────────────────┐
│  ← Nome da Tela          │  ← Header (seta + título)
│                          │
│  [conteúdo da página]   │
│                          │
│                          │
│  [___Home___][Menu fixo] │  ← Bottom tab (HOME apenas)
└──────────────────────────┘
```

---

## 1. Header Mobile (todas as telas, exceto Home)

Sem barra branca fixa (`sticky`, `bg-white/95`, `border-b`, `backdrop-blur-md`).  
Apenas a seta de voltar e o título lado a lado:

```tsx
<div className="flex items-center gap-1 lg:hidden px-1 py-2">
  <button
    type="button"
    onClick={() => navigate(-1)}
    aria-label="Voltar"
    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
  >
    <ArrowLeft className="h-5 w-5" />
  </button>
  <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">
    Nome da Tela
  </h1>
</div>
```

**Regras:**
- `lg:hidden` — aparece **só no mobile**
- Import `ArrowLeft` de `lucide-react`
- Incluir `useNavigate` do `react-router-dom`

---

## 2. Header Mobile — Home (Dashboard)

Na Home **não tem seta de voltar**. Apenas o nome do setor e saudação:

```tsx
<div className="lg:hidden px-1 py-2">
  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
    Guarda Municipal
  </p>
  <p className="mt-0.5 text-sm font-semibold text-slate-500">
    Olá, {nome}!
  </p>
</div>
```

Para setores sem saudação (ex: Jovem Guarda SPA), apenas o título:

```tsx
<div className="lg:hidden px-1 py-2">
  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
    Jovem Guarda Cidadã
  </p>
  <h1 className="text-lg font-bold tracking-tight text-slate-900">Início</h1>
</div>
```

---

## 3. Banner Desktop (gradient header)

O banner com gradiente e título grande é **exclusivo do desktop** (`hidden lg:block`).

### Cores por setor:

| Setor | Gradiente |
|---|---|
| **Guarda Municipal** | `bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_45%,_#2563eb_100%)]` (slate → azul) |
| **Jovem Guarda** | `bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800` (slate → teal/esverdeado) |
| **Demutran** | _(definir)_ slate → amarelo |

```tsx
<section className="hidden lg:block rounded-[24px] p-4 text-white ...">
  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
    Nome do Setor
  </p>
  <h1 className="mt-2 text-xl font-black text-white sm:text-2xl lg:text-[34px]">
    Nome da Tela
  </h1>
</section>
```

**Regra:** `hidden lg:block` — nunca aparece no mobile.

---

## 4. Bottom Tab Bar (menu fixo)

O menu fixo aparece **apenas na Home**.

### GuardsLayout (Perfil do Guarda):

```tsx
const isHomePage = location.pathname === '/admin/perfil-guardas/guarda-municipal/dashboard';

<main className={`... ${isHomePage ? 'pb-[calc(6.4rem+var(--safe-area-bottom))]' : 'pb-4'}`}>

{isHomePage && (
  <nav className="fixed bottom-0 left-0 right-0 z-50 ... lg:hidden">
    {/* 5 ícones */}
  </nav>
)}
```

### AdminLayout (Jovem Guarda, Demutran, etc.):

O `AdminLayout` gerencia o bottom tab. Para seguir o padrão, deve-se aplicar a mesma lógica de `isHomePage` para mostrar/ocultar o menu.

---

## 5. Caso Especial — SPA (JovemGuardaCidada)

Por ser uma SPA com seções internas (alunos, turmas, etc.), o header varia conforme o estado:

- **Home (dashboard):** sem seta, apenas título
- **Seção interna (ex: Alunos):** seta de voltar → `navigate('/admin/dashboard/jovem-guarda')`
- **Aluno selecionado:** seta de voltar → `navigate('/admin/dashboard/jovem-guarda/alunos')`

```tsx
{selected ? (
  // Aluno selecionado → volta para lista de alunos
  <div className="flex items-center gap-1 lg:hidden px-1 py-2">
    <button onClick={() => navigate('/admin/dashboard/jovem-guarda/alunos')} ...>
      <ArrowLeft className="h-5 w-5" />
    </button>
    <h1 className="...">{mobileTitle}</h1>
  </div>
) : active !== 'dashboard' ? (
  // Seção interna → volta para dashboard
  <div className="flex items-center gap-1 lg:hidden px-1 py-2">
    <button onClick={() => navigate('/admin/dashboard/jovem-guarda')} ...>
      <ArrowLeft className="h-5 w-5" />
    </button>
    <h1 className="...">{mobileTitle}</h1>
  </div>
) : (
  // Home → sem seta
  <div className="lg:hidden px-1 py-2">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
      Jovem Guarda Cidadã
    </p>
    <h1 className="text-lg font-bold tracking-tight text-slate-900">Início</h1>
  </div>
)}
```

---

## 6. Checklist para Nova Tela

- [ ] Header mobile com `lg:hidden` (seta + título) sem `bg-white/95`
- [ ] Banner desktop com `hidden lg:block` com gradiente do setor
- [ ] Sem `sticky`, `border-b`, `backdrop-blur-md` no mobile
- [ ] Se for Home: sem seta, com saudação/título
- [ ] Se não for Home: sem bottom tab
- [ ] Import `ArrowLeft` + `useNavigate` quando houver seta
- [ ] Gradiente do banner condizente com o setor (azul/verde/amarelo)
