export interface NoteRecord {
  id: string;
  user_id: string;
  category: string | null;
  title: string;
  description: string;
  favorite: boolean;
  pinned: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NoteFormValues {
  title: string;
  description: string;
  category: string;
  favorite: boolean;
  pinned: boolean;
}

export const DEFAULT_NOTE_CATEGORIES = [
  'Pessoal',
  'Operacional',
  'Escalas',
  'Telefones',
  'Procedimentos',
  'Legislacao',
  'Equipamentos',
  'Outros',
] as const;

export const EMPTY_NOTE_FORM: NoteFormValues = {
  title: '',
  description: '',
  category: '',
  favorite: false,
  pinned: false,
};
