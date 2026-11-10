import { RegistroBase } from './RegistroBase';
import type { AuthorSummary, CountrySummary, TutorSummary } from './types';

// Tipos para las respuestas de la API (raw data)
interface ArticleApiResponse {
  id_article: number;
  title: string;
  journal: string;
  voulume: string;
  pages: string;
  number?: string | null;
  keywords?: string | null;
  doi?: string | null;
  resume?: string | null;
  id_article_type?: number | null;
  report_date?: string | null;
  issn?: string | null;
  id_country?: number | null;
  month_only: number;
  year_only: number;
  id_project?: number | null;
  id_group?: number | null;
  published: boolean;
  article_type?: any;
  authors?: AuthorSummary[];
  country?: CountrySummary | null;
}

interface BookApiResponse {
  id_book: number;
  title: string;
  chapter_title: string;
  editor?: string | null;
  voulume?: string | null;
  number?: string | null;
  series?: string | null;
  pages?: string | null;
  publisher?: string | null;
  keywords?: string | null;
  resume?: string | null;
  isbn?: string | null;
  report_date?: string | null;
  id_country?: number | null;
  is_chapter: boolean;
  month_only: number;
  year_only: number;
  id_project?: number | null;
  id_group?: number | null;
  authors?: AuthorSummary[];
  country?: CountrySummary | null;
}

interface MonographApiResponse {
  id_monograph: number;
  title: string;
  isbn: string;
  pages: string;
  number?: string | null;
  month?: string | null;
  keywords?: string | null;
  resume?: string | null;
  cenda?: string | null;
  report_date?: string | null;
  month_only: number;
  year_only: number;
  id_country?: number | null;
  id_project?: number | null;
  id_group?: number | null;
  authors?: AuthorSummary[];
  country?: CountrySummary | null;
}

interface NormApiResponse {
  id_norm: number;
  title: string;
  registration_number: string;
  pages: string;
  keywords?: string | null;
  resume?: string | null;
  id_norm_type?: number | null;
  report_date?: string | null;
  id_country?: number | null;
  month_only: number;
  year_only: number;
  id_project?: number | null;
  id_group?: number | null;
  norm_type?: any;
  authors?: AuthorSummary[];
  country?: CountrySummary | null;
}

interface PatentApiResponse {
  id_patent: number;
  title: string;
  reg_number: string;
  yearfiled: string;
  language?: string | null;
  assignee?: string | null;
  monthfield?: string | null;
  keywords?: string | null;
  resume?: string | null;
  report_date?: string | null;
  month_only: number;
  year_only: number;
  id_country?: number | null;
  is_conceded: boolean;
  id_project?: number | null;
  id_group?: number | null;
  authors?: AuthorSummary[];
  country?: CountrySummary | null;
}

interface SoftwareApiResponse {
  id_software: number;
  title: string;
  number: string;
  yearfiled: string;
  language?: string | null;
  assignee?: string | null;
  monthfield?: string | null;
  keywords?: string | null;
  resume?: string | null;
  report_date?: string | null;
  month_only: number;
  year_only: number;
  id_country?: number | null;
  is_conceded: boolean;
  id_project?: number | null;
  is_multimedia: boolean;
  id_group?: number | null;
  authors?: AuthorSummary[];
  country?: CountrySummary | null;
}

interface ThesisApiResponse {
  id_thesis: number;
  title: string;
  institution: string;
  keywords?: string | null;
  resume?: string | null;
  id_thesis_type?: number | null;
  report_date?: string | null;
  id_country?: number | null;
  month_only: number;
  year_only: number;
  id_project?: number | null;
  id_group?: number | null;
  thesis_type?: any;
  tutors?: TutorSummary[];
  authors?: AuthorSummary[];
  country?: CountrySummary | null;
}

interface EncounterApiResponse {
  id_encounter: number;
  title: string;
  encounter_name: string;
  keywords?: string | null;
  resume?: string | null;
  id_encounter_type?: number | null;
  report_date?: string | null;
  isbn?: string | null;
  city?: string | null;
  issn?: string | null;
  organizer?: string | null;
  id_country?: number | null;
  month_only: number;
  year_only: number;
  id_project?: number | null;
  id_group?: number | null;
  encounter_type?: any;
  authors?: AuthorSummary[];
  country?: CountrySummary | null;
}

interface PrizeApiResponse {
  id_prize: number;
  title: string;
  grant_institution: string;
  keywords?: string | null;
  resume?: string | null;
  id_prize_type?: number | null;
  report_date?: string | null;
  id_country?: number | null;
  month_only: number;
  year_only: number;
  id_project?: number | null;
  id_group?: number | null;
  prize_type?: any;
  authors?: AuthorSummary[];
  country?: CountrySummary | null;
}

/**
 * Clase para registros de tipo Artículo
 */
export class ArticuloRegistro extends RegistroBase {
  readonly journal: string;
  readonly voulume: string;
  readonly pages: string;
  readonly number: string | null;
  readonly doi: string | null;
  readonly issn: string | null;
  readonly published: boolean;
  readonly article_type: any;

  constructor(data: ArticleApiResponse) {
    super({
      id: data.id_article.toString(),
      tipo: 'articulo',
      titulo: data.title,
      autores: data.authors || [],
      year_only: data.year_only,
      month_only: data.month_only,
      keywords: data.keywords,
      resume: data.resume,
      id_country: data.id_country,
      id_project: data.id_project,
      id_group: data.id_group,
      country: data.country,
    });
    this.journal = data.journal;
    this.voulume = data.voulume;
    this.pages = data.pages;
    this.number = data.number ?? null;
    this.doi = data.doi ?? null;
    this.issn = data.issn ?? null;
    this.published = data.published ?? true;
    this.article_type = data.article_type;
  }
}

/**
 * Clase para registros de tipo Libro
 */
export class LibroRegistro extends RegistroBase {
  readonly chapter_title: string;
  readonly editor: string | null;
  readonly voulume: string | null;
  readonly number: string | null;
  readonly series: string | null;
  readonly pages: string | null;
  readonly publisher: string | null;
  readonly isbn: string | null;
  readonly is_chapter: boolean;

  constructor(data: BookApiResponse) {
    super({
      id: data.id_book.toString(),
      tipo: 'libro',
      titulo: data.title,
      autores: data.authors || [],
      year_only: data.year_only,
      month_only: data.month_only,
      keywords: data.keywords,
      resume: data.resume,
      id_country: data.id_country,
      id_project: data.id_project,
      id_group: data.id_group,
      country: data.country,
    });
    this.chapter_title = data.chapter_title;
    this.editor = data.editor ?? null;
    this.voulume = data.voulume ?? null;
    this.number = data.number ?? null;
    this.series = data.series ?? null;
    this.pages = data.pages ?? null;
    this.publisher = data.publisher ?? null;
    this.isbn = data.isbn ?? null;
    this.is_chapter = data.is_chapter ?? false;
  }
}

/**
 * Clase para registros de tipo Monografía
 */
export class MonografiaRegistro extends RegistroBase {
  readonly isbn: string;
  readonly pages: string;
  readonly number: string | null;
  readonly month: string | null;
  readonly cenda: string | null;

  constructor(data: MonographApiResponse) {
    super({
      id: data.id_monograph.toString(),
      tipo: 'monografia',
      titulo: data.title,
      autores: data.authors || [],
      year_only: data.year_only,
      month_only: data.month_only,
      keywords: data.keywords,
      resume: data.resume,
      id_country: data.id_country,
      id_project: data.id_project,
      id_group: data.id_group,
      country: data.country,
    });
    this.isbn = data.isbn;
    this.pages = data.pages;
    this.number = data.number ?? null;
    this.month = data.month ?? null;
    this.cenda = data.cenda ?? null;
  }
}

/**
 * Clase para registros de tipo Norma
 */
export class NormaRegistro extends RegistroBase {
  readonly registration_number: string;
  readonly pages: string;
  readonly norm_type: any;

  constructor(data: NormApiResponse) {
    super({
      id: data.id_norm.toString(),
      tipo: 'norma',
      titulo: data.title,
      autores: data.authors || [],
      year_only: data.year_only,
      month_only: data.month_only,
      keywords: data.keywords,
      resume: data.resume,
      id_country: data.id_country,
      id_project: data.id_project,
      id_group: data.id_group,
      country: data.country,
    });
    this.registration_number = data.registration_number;
    this.pages = data.pages;
    this.norm_type = data.norm_type;
  }
}

/**
 * Clase para registros de tipo Patente
 */
export class PatenteRegistro extends RegistroBase {
  readonly reg_number: string;
  readonly yearfiled: string;
  readonly language: string | null;
  readonly assignee: string | null;
  readonly monthfield: string | null;
  readonly is_conceded: boolean;

  constructor(data: PatentApiResponse) {
    super({
      id: data.id_patent.toString(),
      tipo: 'patente',
      titulo: data.title,
      autores: data.authors || [],
      year_only: data.year_only,
      month_only: data.month_only,
      keywords: data.keywords,
      resume: data.resume,
      id_country: data.id_country,
      id_project: data.id_project,
      id_group: data.id_group,
      country: data.country,
    });
    this.reg_number = data.reg_number;
    this.yearfiled = data.yearfiled;
    this.language = data.language ?? null;
    this.assignee = data.assignee ?? null;
    this.monthfield = data.monthfield ?? null;
    this.is_conceded = data.is_conceded ?? false;
  }
}

/**
 * Clase para registros de tipo Software
 */
export class SoftwareRegistro extends RegistroBase {
  readonly number: string;
  readonly yearfiled: string;
  readonly language: string | null;
  readonly assignee: string | null;
  readonly monthfield: string | null;
  readonly is_conceded: boolean;
  readonly is_multimedia: boolean;

  constructor(data: SoftwareApiResponse) {
    super({
      id: data.id_software.toString(),
      tipo: 'software',
      titulo: data.title,
      autores: data.authors || [],
      year_only: data.year_only,
      month_only: data.month_only,
      keywords: data.keywords,
      resume: data.resume,
      id_country: data.id_country,
      id_project: data.id_project,
      id_group: data.id_group,
      country: data.country,
    });
    this.number = data.number;
    this.yearfiled = data.yearfiled;
    this.language = data.language ?? null;
    this.assignee = data.assignee ?? null;
    this.monthfield = data.monthfield ?? null;
    this.is_conceded = data.is_conceded ?? false;
    this.is_multimedia = data.is_multimedia ?? false;
  }
}

/**
 * Clase para registros de tipo Tesis
 */
export class TesisRegistro extends RegistroBase {
  readonly institution: string;
  readonly thesis_type: any;
  readonly tutors: TutorSummary[];

  constructor(data: ThesisApiResponse) {
    super({
      id: data.id_thesis.toString(),
      tipo: 'tesis',
      titulo: data.title,
      autores: data.authors || [],
      year_only: data.year_only,
      month_only: data.month_only,
      keywords: data.keywords,
      resume: data.resume,
      id_country: data.id_country,
      id_project: data.id_project,
      id_group: data.id_group,
      country: data.country,
    });
    this.institution = data.institution;
    this.thesis_type = data.thesis_type;
    this.tutors = data.tutors || [];
  }
}

/**
 * Clase para registros de tipo Evento (Encuentro)
 */
export class EventoRegistro extends RegistroBase {
  readonly encounter_name: string;
  readonly isbn: string | null;
  readonly city: string | null;
  readonly issn: string | null;
  readonly organizer: string | null;
  readonly encounter_type: any;

  constructor(data: EncounterApiResponse) {
    super({
      id: data.id_encounter.toString(),
      tipo: 'evento',
      titulo: data.title,
      autores: data.authors || [],
      year_only: data.year_only,
      month_only: data.month_only,
      keywords: data.keywords,
      resume: data.resume,
      id_country: data.id_country,
      id_project: data.id_project,
      id_group: data.id_group,
      country: data.country,
    });
    this.encounter_name = data.encounter_name;
    this.isbn = data.isbn ?? null;
    this.city = data.city ?? null;
    this.issn = data.issn ?? null;
    this.organizer = data.organizer ?? null;
    this.encounter_type = data.encounter_type;
  }
}

/**
 * Clase para registros de tipo Premio
 */
export class PremioRegistro extends RegistroBase {
  readonly grant_institution: string;
  readonly prize_type: any;

  constructor(data: PrizeApiResponse) {
    super({
      id: data.id_prize.toString(),
      tipo: 'premio',
      titulo: data.title,
      autores: data.authors || [],
      year_only: data.year_only,
      month_only: data.month_only,
      keywords: data.keywords,
      resume: data.resume,
      id_country: data.id_country,
      id_project: data.id_project,
      id_group: data.id_group,
      country: data.country,
    });
    this.grant_institution = data.grant_institution;
    this.prize_type = data.prize_type;
  }
}

// Tipo unión para todos los registros
export type Registro =
  | ArticuloRegistro
  | LibroRegistro
  | MonografiaRegistro
  | NormaRegistro
  | PatenteRegistro
  | SoftwareRegistro
  | TesisRegistro
  | EventoRegistro
  | PremioRegistro;

