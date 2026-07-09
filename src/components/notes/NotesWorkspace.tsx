import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  NotebookPen,
  Pin,
  Plus,
  Printer,
  Search,
  Star,
  Trash2,
  Eye,
  Pencil,
  RefreshCcw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { DEFAULT_NOTE_CATEGORIES, EMPTY_NOTE_FORM, type NoteFormValues, type NoteRecord } from '@/types/notes';

type NotesWorkspaceProps = {
  variant: 'admin' | 'guard';
};

type ModalMode = 'create' | 'edit' | 'view';

const DRAFT_STORAGE_PREFIX = 'notes:draft';

const formatNoteDate = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildFormFromNote = (note: NoteRecord): NoteFormValues => ({
  title: note.title,
  description: note.description,
  category: note.category || '',
  favorite: note.favorite,
  pinned: note.pinned,
});

const normalizeCategory = (value: string) => value.trim();

const normalizeNote = (value: unknown): NoteRecord => value as NoteRecord;

export function NotesWorkspace({ variant }: NotesWorkspaceProps) {
  const { profile } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [activeNote, setActiveNote] = useState<NoteRecord | null>(null);
  const [formValues, setFormValues] = useState<NoteFormValues>(EMPTY_NOTE_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [draftRecovered, setDraftRecovered] = useState(false);

  const audienceLabel = variant === 'admin' ? 'Painel interno' : 'Area pessoal do guarda';
  const boardSubtitle = variant === 'admin'
    ? 'Anotacoes privadas, leves e organizadas em cards para consulta rapida.'
    : 'Bloco pessoal para lembretes operacionais, contatos e observacoes do plantao.';

  const draftStorageKey = useMemo(() => {
    if (!profile?.user_id) return null;
    const context = variant === 'guard'
      ? 'guard'
      : profile?.setor_slug || 'admin';
    return `${DRAFT_STORAGE_PREFIX}:${context}:${profile.user_id}:${activeNote?.id || 'new'}`;
  }, [activeNote?.id, profile?.setor_slug, profile?.user_id, variant]);

  const loadNotes = async () => {
    if (!profile?.user_id) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', profile.user_id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) {
      setLoadError(error.message);
      setNotes([]);
      setLoading(false);
      return;
    }

    setNotes(((data || []) as unknown[]).map(normalizeNote));
    setLoading(false);
  };

  useEffect(() => {
    void loadNotes();
  }, [profile?.user_id]);

  useEffect(() => {
    if (!isModalOpen || modalMode === 'view' || !draftStorageKey) return;

    const hasContent = Boolean(
      formValues.title.trim() ||
      formValues.description.trim() ||
      formValues.category.trim() ||
      formValues.favorite ||
      formValues.pinned,
    );

    const timer = window.setTimeout(() => {
      if (!hasContent) {
        window.localStorage.removeItem(draftStorageKey);
        return;
      }

      window.localStorage.setItem(draftStorageKey, JSON.stringify(formValues));
    }, 450);

    return () => window.clearTimeout(timer);
  }, [draftStorageKey, formValues, isModalOpen, modalMode]);

  const categoryOptions = useMemo(() => {
    const merged = new Set<string>(DEFAULT_NOTE_CATEGORIES);
    notes.forEach((note) => {
      if (note.category?.trim()) {
        merged.add(note.category.trim());
      }
    });
    if (formValues.category.trim()) {
      merged.add(formValues.category.trim());
    }
    return Array.from(merged).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [formValues.category, notes]);

  const filteredNotes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...notes]
      .filter((note) => {
        if (selectedCategory !== 'todas' && (note.category || '') !== selectedCategory) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const haystack = [
          note.title,
          note.description,
          note.category || '',
        ].join(' ').toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .sort((left, right) => {
        if (left.pinned !== right.pinned) {
          return left.pinned ? -1 : 1;
        }
        if (left.favorite !== right.favorite) {
          return left.favorite ? -1 : 1;
        }
        return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
      });
  }, [notes, searchTerm, selectedCategory]);

  const resetModalState = () => {
    setIsModalOpen(false);
    setModalMode('create');
    setActiveNote(null);
    setFormValues(EMPTY_NOTE_FORM);
    setDraftRecovered(false);
  };

  const restoreDraft = (baseValues: NoteFormValues, key: string | null) => {
    if (!key) {
      setFormValues(baseValues);
      setDraftRecovered(false);
      return;
    }

    const savedDraft = window.localStorage.getItem(key);
    if (!savedDraft) {
      setFormValues(baseValues);
      setDraftRecovered(false);
      return;
    }

    try {
      const parsed = JSON.parse(savedDraft) as Partial<NoteFormValues>;
      setFormValues({
        title: parsed.title ?? baseValues.title,
        description: parsed.description ?? baseValues.description,
        category: parsed.category ?? baseValues.category,
        favorite: parsed.favorite ?? baseValues.favorite,
        pinned: parsed.pinned ?? baseValues.pinned,
      });
      setDraftRecovered(true);
    } catch {
      setFormValues(baseValues);
      setDraftRecovered(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setActiveNote(null);
    setIsModalOpen(true);
    const key = profile?.user_id
      ? `${DRAFT_STORAGE_PREFIX}:${variant === 'guard' ? 'guard' : profile?.setor_slug || 'admin'}:${profile.user_id}:new`
      : null;
    restoreDraft(EMPTY_NOTE_FORM, key);
  };

  const openEditModal = (note: NoteRecord) => {
    setModalMode('edit');
    setActiveNote(note);
    setIsModalOpen(true);
    const key = profile?.user_id
      ? `${DRAFT_STORAGE_PREFIX}:${variant === 'guard' ? 'guard' : profile?.setor_slug || 'admin'}:${profile.user_id}:${note.id}`
      : null;
    restoreDraft(buildFormFromNote(note), key);
  };

  const openViewModal = (note: NoteRecord) => {
    setModalMode('view');
    setActiveNote(note);
    setFormValues(buildFormFromNote(note));
    setDraftRecovered(false);
    setIsModalOpen(true);
  };

  const removeDraft = () => {
    if (draftStorageKey) {
      window.localStorage.removeItem(draftStorageKey);
    }
  };

  const handleSaveNote = async () => {
    const title = formValues.title.trim();
    const description = formValues.description.trim();
    const category = normalizeCategory(formValues.category);

    if (!profile?.user_id) {
      toast({ title: 'Sessao invalida', description: 'Nao foi possivel identificar o usuario logado.', variant: 'destructive' });
      return;
    }

    if (!title || !description) {
      toast({ title: 'Campos obrigatorios', description: 'Preencha nome e descricao da anotacao.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    const payload = {
      user_id: profile.user_id,
      title,
      description,
      category: category || null,
      favorite: formValues.favorite,
      pinned: formValues.pinned,
      metadata: {},
    };

    if (modalMode === 'edit' && activeNote) {
      const { data, error } = await supabase
        .from('notes')
        .update(payload)
        .eq('id', activeNote.id)
        .select('*')
        .single();

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      const updatedNote = normalizeNote(data);
      setNotes((current) => current.map((note) => note.id === updatedNote.id ? updatedNote : note));
      removeDraft();
      resetModalState();
      toast({ title: 'Anotacao atualizada' });
      setIsSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from('notes')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      toast({ title: 'Erro ao criar anotacao', description: error.message, variant: 'destructive' });
      setIsSaving(false);
      return;
    }

    const createdNote = normalizeNote(data);
    setNotes((current) => [createdNote, ...current]);
    removeDraft();
    resetModalState();
    toast({ title: 'Anotacao criada' });
    setIsSaving(false);
  };

  const handleToggleFlag = async (
    note: NoteRecord,
    field: 'favorite' | 'pinned',
    value: boolean,
  ) => {
    const { data, error } = await supabase
      .from('notes')
      .update({ [field]: value })
      .eq('id', note.id)
      .select('*')
      .single();

    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return;
    }

    const updatedNote = normalizeNote(data);
    setNotes((current) => current.map((item) => item.id === updatedNote.id ? updatedNote : item));
  };

  const handleDeleteNote = async (note: NoteRecord) => {
    const confirmed = await confirm({
      title: 'Excluir anotacao',
      description: `A anotacao "${note.title}" sera movida para exclusao logica.`,
      confirmText: 'Excluir',
      variant: 'destructive',
    });

    if (!confirmed) return;

    const { error } = await supabase
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', note.id);

    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }

    setNotes((current) => current.filter((item) => item.id !== note.id));
    if (activeNote?.id === note.id) {
      resetModalState();
    }
    toast({ title: 'Anotacao removida' });
  };

  const handlePrintNote = (note: NoteRecord) => {
    const html = `
      <div style="display:flex;flex-direction:column;gap:20px;">
        <header style="border-bottom:2px solid #e2e8f0;padding-bottom:16px;">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#475569;">Anotacao</p>
          <h1 style="margin:10px 0 0;font-size:28px;line-height:1.1;color:#0f172a;">${escapeHtml(note.title)}</h1>
          <p style="margin:10px 0 0;font-size:14px;color:#64748b;">Categoria: ${escapeHtml(note.category || 'Sem categoria')}</p>
        </header>
        <section style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
          <div style="border:1px solid #e2e8f0;border-radius:16px;padding:14px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;">Criado em</p>
            <p style="margin:8px 0 0;font-size:15px;font-weight:600;color:#0f172a;">${escapeHtml(formatNoteDate(note.created_at))}</p>
          </div>
          <div style="border:1px solid #e2e8f0;border-radius:16px;padding:14px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;">Atualizado em</p>
            <p style="margin:8px 0 0;font-size:15px;font-weight:600;color:#0f172a;">${escapeHtml(formatNoteDate(note.updated_at))}</p>
          </div>
        </section>
        <section style="border:1px solid #e2e8f0;border-radius:22px;padding:20px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;">Descricao completa</p>
          <div style="white-space:pre-wrap;font-size:15px;line-height:1.8;color:#0f172a;">${escapeHtml(note.description)}</div>
        </section>
      </div>
    `;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!printWindow) {
      toast({ title: 'Pop-up bloqueado', description: 'Permita pop-ups para imprimir a anotacao.', variant: 'destructive' });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(note.title)}</title>
          <style>
            @page { size: A4 portrait; margin: 18mm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #fff; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  const activeNotesCount = notes.length;
  const pinnedCount = notes.filter((note) => note.pinned).length;
  const favoriteCount = notes.filter((note) => note.favorite).length;

  const modalTitle = modalMode === 'create'
    ? 'Nova anotacao'
    : modalMode === 'edit'
      ? 'Editar anotacao'
      : 'Detalhes da anotacao';

  const modalDescription = modalMode === 'view'
    ? 'Visualize o conteudo completo e imprima quando precisar.'
    : 'Edite rapidamente e o rascunho sera salvo automaticamente enquanto voce digita.';

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(15,118,110,0.94)_55%,_rgba(45,212,191,0.88)_100%)] text-white shadow-[0_28px_56px_-34px_rgba(15,23,42,0.5)]">
        <div className="flex flex-col gap-6 px-6 py-7 sm:px-8 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
              <NotebookPen className="h-3.5 w-3.5" />
              {audienceLabel}
            </div>
            <h1 className="mt-4 text-[32px] font-black tracking-[-0.06em] sm:text-[40px]">Anotacoes</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-[15px]">
              {boardSubtitle}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Ativas" value={activeNotesCount} />
            <MetricCard label="Fixadas" value={pinnedCount} />
            <MetricCard label="Favoritas" value={favoriteCount} />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.35)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Pesquisar por nome, descricao ou categoria"
                className="h-12 rounded-[18px] border-slate-200 bg-slate-50 pl-11 text-[15px] font-medium"
              />
            </div>
            <div className="md:w-[240px]">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-12 rounded-[18px] border-slate-200 bg-slate-50 text-[15px] font-medium">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={openCreateModal}
            className="hidden h-12 rounded-[18px] px-5 text-[15px] font-semibold shadow-[0_16px_28px_-20px_rgba(15,23,42,0.6)] lg:inline-flex"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova anotacao
          </Button>
        </div>
      </section>

      {loading ? <NotesBoardSkeleton /> : null}

      {!loading && loadError ? (
        <ErrorState message={loadError} onRetry={() => void loadNotes()} />
      ) : null}

      {!loading && !loadError && filteredNotes.length === 0 ? (
        <EmptyNotesState
          hasFilters={Boolean(searchTerm.trim()) || selectedCategory !== 'todas'}
          onCreate={openCreateModal}
        />
      ) : null}

      {!loading && !loadError && filteredNotes.length > 0 ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-4 min-[2200px]:grid-cols-5">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onView={() => openViewModal(note)}
              onEdit={() => openEditModal(note)}
              onDelete={() => void handleDeleteNote(note)}
              onPrint={() => handlePrintNote(note)}
              onToggleFavorite={() => void handleToggleFlag(note, 'favorite', !note.favorite)}
              onTogglePinned={() => void handleToggleFlag(note, 'pinned', !note.pinned)}
            />
          ))}
        </section>
      ) : null}

      <Button
        onClick={openCreateModal}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_16px_38px_-14px_rgba(15,23,42,0.5)] transition-transform hover:bg-slate-800 active:scale-95 lg:hidden"
        aria-label="Criar anotacao"
      >
        <Plus className="h-5 w-5" />
      </Button>

      <ResponsiveDialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) resetModalState();
          else setIsModalOpen(true);
        }}
        title={modalTitle}
        description={modalDescription}
        onCancel={resetModalState}
        onConfirm={modalMode === 'view' ? undefined : handleSaveNote}
        confirmLabel={modalMode === 'edit' ? 'Salvar alteracoes' : 'Criar anotacao'}
        confirmDisabled={isSaving}
        footer={modalMode === 'view'
          ? (
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={resetModalState}>
                Fechar
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => activeNote && handlePrintNote(activeNote)}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button className="flex-1" onClick={() => activeNote && openEditModal(activeNote)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </div>
          )
          : (
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={resetModalState}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSaveNote} disabled={isSaving}>
                {modalMode === 'edit' ? 'Salvar alteracoes' : 'Criar anotacao'}
              </Button>
            </div>
          )}
      >
        {modalMode === 'view' && activeNote ? (
          <NoteDetails note={activeNote} />
        ) : (
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="note-title">Nome *</label>
              <Input
                id="note-title"
                value={formValues.title}
                onChange={(event) => setFormValues((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ex.: Procedimentos, contatos, escalas..."
                className="h-12 rounded-[16px] border-slate-200 bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="note-category">Categoria</label>
              <Input
                id="note-category"
                value={formValues.category}
                onChange={(event) => setFormValues((current) => ({ ...current, category: event.target.value }))}
                placeholder="Use uma categoria existente ou crie uma nova"
                className="h-12 rounded-[16px] border-slate-200 bg-slate-50"
              />
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setFormValues((current) => ({ ...current, category }))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      formValues.category === category
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="note-description">Descricao *</label>
              <Textarea
                id="note-description"
                value={formValues.description}
                onChange={(event) => setFormValues((current) => ({ ...current, description: event.target.value }))}
                placeholder="Escreva a anotacao em texto simples."
                rows={10}
                className="min-h-[220px] rounded-[20px] border-slate-200 bg-slate-50"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TogglePanel
                title="Favorita"
                description="Mantem a anotacao em destaque entre as nao fixadas."
                checked={formValues.favorite}
                onCheckedChange={(favorite) => setFormValues((current) => ({ ...current, favorite }))}
              />
              <TogglePanel
                title="Fixada"
                description="Sempre sobe para o topo do board."
                checked={formValues.pinned}
                onCheckedChange={(pinned) => setFormValues((current) => ({ ...current, pinned }))}
              />
            </div>

            <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              {draftRecovered
                ? 'Rascunho recuperado automaticamente deste dispositivo.'
                : 'Rascunho salvo automaticamente enquanto voce digita.'}
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {confirmDialog}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[22px] border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">{label}</p>
      <p className="mt-2 text-[28px] font-black tracking-[-0.06em] text-white">{value}</p>
    </div>
  );
}

type NoteCardProps = {
  note: NoteRecord;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onToggleFavorite: () => void;
  onTogglePinned: () => void;
};

function NoteCard({
  note,
  onView,
  onEdit,
  onDelete,
  onPrint,
  onToggleFavorite,
  onTogglePinned,
}: NoteCardProps) {
  return (
    <article className="group rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-1 hover:shadow-[0_28px_52px_-36px_rgba(15,23,42,0.42)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {note.category ? (
              <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                {note.category}
              </Badge>
            ) : null}
            {note.pinned ? (
              <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                <Pin className="mr-1 h-3 w-3" />
                Fixada
              </Badge>
            ) : null}
            {note.favorite ? (
              <Badge variant="outline" className="rounded-full border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700">
                <Star className="mr-1 h-3 w-3" />
                Favorita
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-4 text-[22px] font-black tracking-[-0.05em] text-slate-900">{note.title}</h2>
        </div>

        <div className="flex items-center gap-1">
          <IconToggleButton active={note.pinned} onClick={onTogglePinned} label="Fixar anotacao">
            <Pin className="h-4 w-4" />
          </IconToggleButton>
          <IconToggleButton active={note.favorite} onClick={onToggleFavorite} label="Favoritar anotacao">
            <Star className="h-4 w-4" />
          </IconToggleButton>
        </div>
      </div>

      <p className="mt-4 overflow-hidden text-sm leading-7 text-slate-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5]">
        {note.description}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Atualizacao</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{formatNoteDate(note.updated_at)}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        <ActionButton onClick={onView} label="Ver">
          <Eye className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={onEdit} label="Editar">
          <Pencil className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={onPrint} label="Imprimir">
          <Printer className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={onDelete} label="Excluir" tone="danger">
          <Trash2 className="h-4 w-4" />
        </ActionButton>
      </div>
    </article>
  );
}

function IconToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
        active
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

function ActionButton({
  onClick,
  label,
  tone = 'default',
  children,
}: {
  onClick: () => void;
  label: string;
  tone?: 'default' | 'danger';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-[18px] border text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
        tone === 'danger'
          ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900'
      }`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function TogglePanel({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function NoteDetails({ note }: { note: NoteRecord }) {
  return (
    <div className="space-y-4 py-1">
      <div className="flex flex-wrap gap-2">
        {note.category ? (
          <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
            {note.category}
          </Badge>
        ) : null}
        {note.pinned ? (
          <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700">
            <Pin className="mr-1 h-3 w-3" />
            Fixada
          </Badge>
        ) : null}
        {note.favorite ? (
          <Badge variant="outline" className="rounded-full border-rose-200 bg-rose-50 px-3 py-1 font-semibold text-rose-700">
            <Star className="mr-1 h-3 w-3" />
            Favorita
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoBox label="Criada em" value={formatNoteDate(note.created_at)} />
        <InfoBox label="Atualizada em" value={formatNoteDate(note.updated_at)} />
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Descricao completa</p>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{note.description}</div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function NotesBoardSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-4 min-[2200px]:grid-cols-5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-[30px] border border-slate-200 bg-white p-5">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="mt-4 h-8 w-3/4 rounded-xl" />
          <Skeleton className="mt-5 h-4 w-full rounded-lg" />
          <Skeleton className="mt-2 h-4 w-11/12 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-4/5 rounded-lg" />
          <div className="mt-6 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, actionIndex) => (
              <Skeleton key={actionIndex} className="h-12 rounded-[18px]" />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function EmptyNotesState({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean;
  onCreate: () => void;
}) {
  return (
    <section className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-[0_20px_44px_-36px_rgba(15,23,42,0.28)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <NotebookPen className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-[26px] font-black tracking-[-0.05em] text-slate-900">
        {hasFilters ? 'Nenhuma anotacao encontrada' : 'Comece sua primeira anotacao'}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
        {hasFilters
          ? 'Ajuste a busca ou o filtro de categoria para localizar outra anotacao.'
          : 'Crie um card pessoal para contatos, procedimentos, escalas, lembretes ou qualquer informacao de trabalho que precise ficar sempre a mao.'}
      </p>
      {!hasFilters ? (
        <Button onClick={onCreate} className="mt-6 h-12 rounded-[18px] px-5 text-[15px] font-semibold">
          <Plus className="mr-2 h-4 w-4" />
          Nova anotacao
        </Button>
      ) : null}
    </section>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-[30px] border border-rose-200 bg-rose-50 px-6 py-10 text-center">
      <h2 className="text-[24px] font-black tracking-[-0.05em] text-rose-700">Erro ao carregar anotacoes</h2>
      <p className="mt-3 text-sm leading-6 text-rose-600">{message}</p>
      <Button variant="outline" className="mt-5 rounded-[18px] border-rose-200 bg-white text-rose-700" onClick={onRetry}>
        <RefreshCcw className="mr-2 h-4 w-4" />
        Tentar novamente
      </Button>
    </section>
  );
}
