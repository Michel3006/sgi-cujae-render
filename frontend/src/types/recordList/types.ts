// Resúmenes (usados en todas las respuestas)
export interface CountrySummary {
  id_country: number;
  name: string;
}

export interface AuthorSummary {
  id_integrant: number;
  name: string;
  email?: string;
}

export interface TutorSummary {
  id_integrant: number;
  name: string;
}
// Clase base común
export interface RecordBase {
  id: string; // Será mapeado del id específico
  title: string;
  keywords?: string | null;
  resume?: string | null;
  month_only: number;
  year_only: number;
  id_country?: number | null;
  id_project?: number | null;
  id_group?: number | null;
  authors: AuthorSummary[];
  country?: CountrySummary | null;
  tipo: string; // tipo del registro: 'articulo', 'tesis', etc.
}
// Artículos
export interface Article extends RecordBase {
  tipo: 'articulo';
  journal: string;
  voulume: string;
  pages: string;
  number?: string | null;
  doi?: string | null;
  issn?: string | null;
  published: boolean;
  article_type?: any; // Opcional: puedes tipar si lo necesitas
}

// Libros
export interface Book extends RecordBase {
  tipo: 'libro';
  chapter_title: string;
  editor?: string | null;
  voulume?: string | null;
  number?: string | null;
  series?: string | null;
  pages?: string | null;
  publisher?: string | null;
  isbn?: string | null;
  is_chapter: boolean;
}

// Monografías
export interface Monograph extends RecordBase {
  tipo: 'monografia';
  isbn: string;
  pages: string;
  number?: string | null;
  month?: string | null;
  cenda?: string | null;
}

// Normas
export interface Norm extends RecordBase {
  tipo: 'norma';
  registration_number: string;
  pages: string;
  norm_type?: any;
}

// Patentes
export interface Patent extends RecordBase {
  tipo: 'patente';
  reg_number: string;
  yearfiled: string;
  language?: string | null;
  assignee?: string | null;
  monthfield?: string | null;
  is_conceded: boolean;
}

// Software
export interface Software extends RecordBase {
  tipo: 'software';
  number: string;
  yearfiled: string;
  language?: string | null;
  assignee?: string | null;
  monthfield?: string | null;
  is_conceded: boolean;
  is_multimedia: boolean;
}

// Tesis
export interface Thesis extends RecordBase {
  tipo: 'tesis';
  institution: string;
  thesis_type?: any;
  tutors: TutorSummary[];
}

// Eventos (Encuentros)
export interface Encounter extends RecordBase {
  tipo: 'evento';
  encounter_name: string;
  isbn?: string | null;
  city?: string | null;
  issn?: string | null;
  organizer?: string | null;
  encounter_type?: any;
}

// Premios
export interface Prize extends RecordBase {
  tipo: 'premio';
  grant_institution: string;
  prize_type?: any;
}
// Todos los tipos posibles
export type Record = 
  | Article
  | Book
  | Monograph
  | Norm
  | Patent
  | Software
  | Thesis
  | Encounter
  | Prize;

// Exportamos para el componente
