// Tipos compartidos
export type RecordType =
  | "articulo"
  | "libro"
  | "monografia"
  | "norma"
  | "patente"
  | "software"
  | "evento"
  | "premio"
  | "tesis";

// Datos comunes del formulario
export interface CommonFormData {
  titulo: string;
  tituloCapitulo: string;
  año: number;
  mes: number;
  resumen: string;
  palabrasClave: string;
  pais: number; // Nombre del país → necesitarás mapearlo a id_country si la API lo requiere
}

// Tipo para autor externo en author_ids
export interface ExternalAuthor {
  name: string;
  work_center: string;
  email: string;
  id_country: number;
}

// Tipo para author_ids que puede contener IDs o objetos de autores externos
export type AuthorId = number | ExternalAuthor;

// Tipos específicos para cada endpoint
export interface ArticlePayload {
  title: string;
  journal: string;
  voulume: string; // Nota: probable typo en la API ("voulume" en vez de "volume")
  pages: string;
  author_ids: AuthorId[];
  number: string | null;
  keywords: string | null;
  doi: string | null;
  resume: string | null;
  id_article_type: number | null;
  report_date: string | null;
  issn: string | null;
  id_country: number | null;
  month_only: number;
  year_only: number;
  id_project: number | null;
  only_date: string | null;
  id_group: number | null;
  published: boolean;
}

export interface BookPayload {
  title: string;
  chapter_title: string;
  author_ids: AuthorId[];
  editor: string | null;
  voulume: string;
  number: string | null;
  series: string | null;
  pages: string | null;
  publisher: string | null;
  keywords: string | null;
  resume: string | null;
  isbn: string | null;
  report_date: string | null;
  id_country: number | null;
  is_chapter: boolean;
  month_only: number;
  year_only: number;
  id_project: number | null;
  only_date: string | null;
  id_group: number | null;
}

export interface MonographPayload {
  title: string;
  isbn: string;
  pages: string;
  author_ids: AuthorId[];
  number: string | null;
  month: string | null;
  keywords: string | null;
  resume: string | null;
  cenda: string;
  report_date: string | null;
  month_only: number;
  year_only: number;
  id_country: number | null;
  id_project: number | null;
  only_date: string | null;
  id_group: number | null;
}

export interface NormPayload {
  title: string;
  registration_number: string;
  pages: string;
  author_ids: AuthorId[];
  keywords: string | null;
  resume: string | null;
  id_norm_type: number | null;
  report_date: string | null;
  id_country: number | null;
  month_only: number;
  year_only: number;
  id_project: number | null;
  only_date: string | null;
  id_group: number | null;
}

export interface PatentPayload {
  title: string;
  reg_number: string;
  yearfiled: string;
  author_ids: AuthorId[];
  language: string | null;
  assignee: string;
  monthfield: string | null;
  keywords: string | null;
  resume: string | null;
  report_date: string | null;
  month_only: number;
  year_only: number;
  id_country: number | null;
  is_conceded: boolean;
  id_project: number | null;
  only_date: string | null;
  id_group: number | null;
}

export interface SoftwarePayload {
  title: string;
  number: string;
  yearfiled: string;
  author_ids: AuthorId[];
  language: string | null;
  assignee: string;
  monthfield: string | null;
  keywords: string | null;
  resume: string | null;
  report_date: string | null;
  month_only: number;
  year_only: number;
  id_country: number | null;
  is_conceded: boolean;
  id_project: number | null;
  only_date: string | null;
  is_multimedia: boolean;
  id_group: number | null;
}

export interface EventPayload {
  title: string;
  encounter_name: string;
  author_ids: AuthorId[];
  keywords: string | null;
  resume: string | null;
  id_encounter_type: number | null;
  report_date: string | null;
  isbn: string | null;
  city: string | null;
  issn: string | null;
  organizer: string;
  id_country: number | null;
  month_only: number;
  year_only: number;
  id_project: number | null;
  only_date: string | null;
  id_group: number | null;
}

export interface PrizePayload {
  title: string;
  grant_institution: string;
  author_ids: AuthorId[];
  keywords: string | null;
  resume: string | null;
  id_prize_type: number | null;
  report_date: string | null;
  id_country: number | null;
  month_only: number;
  year_only: number;
  id_project: number | null;
  only_date: string | null;
  id_group: number | null;
}

export interface ThesisPayload {
  title: string;
  institution: string;
  author_ids: AuthorId[];
  tutor_ids: number[];
  keywords: string | null;
  resume: string | null;
  id_thesis_type: number | null;
  report_date: string | null;
  id_country: number | null;
  month_only: number;
  year_only: number;
  id_project: number | null;
  only_date: string | null;
  id_group: number | null;
}