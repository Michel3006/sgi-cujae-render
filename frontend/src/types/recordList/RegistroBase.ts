import type { AuthorSummary, CountrySummary } from './types';

/**
 * Clase abstracta base para todos los tipos de registros científicos.
 * Contiene los campos comunes que todos los registros comparten.
 */
export abstract class RegistroBase {
  readonly id: string;
  readonly tipo: string;
  readonly titulo: string;
  readonly autores: AuthorSummary[];
  readonly year_only: number;
  readonly month_only: number | null;
  readonly keywords: string | null;
  readonly resume: string | null;
  readonly id_country: number | null;
  readonly id_project: number | null;
  readonly id_group: number | null;
  readonly country: CountrySummary | null;

  constructor(data: {
    id: string;
    tipo: string;
    titulo: string;
    autores: AuthorSummary[];
    year_only: number;
    month_only: number | null;
    keywords?: string | null;
    resume?: string | null;
    id_country?: number | null;
    id_project?: number | null;
    id_group?: number | null;
    country?: CountrySummary | null;
  }) {
    this.id = data.id;
    this.tipo = data.tipo;
    this.titulo = data.titulo;
    this.autores = data.autores || [];
    this.year_only = data.year_only;
    this.month_only = data.month_only ?? null;
    this.keywords = data.keywords ?? null;
    this.resume = data.resume ?? null;
    this.id_country = data.id_country ?? null;
    this.id_project = data.id_project ?? null;
    this.id_group = data.id_group ?? null;
    this.country = data.country ?? null;
  }

  /**
   * Obtiene los nombres de los autores como texto separado por comas
   */
  get autoresTexto(): string {
    return this.autores.map((a) => a.name).join(', ');
  }

  /**
   * Obtiene el nombre del tipo de registro formateado para mostrar
   */
  get tipoFormateado(): string {
    const tipos: Record<string, string> = {
      articulo: 'Artículo',
      libro: 'Libro',
      monografia: 'Monografía',
      norma: 'Norma',
      patente: 'Patente',
      software: 'Software',
      tesis: 'Tesis',
      evento: 'Evento',
      premio: 'Premio',
    };
    return tipos[this.tipo] || this.tipo;
  }
}

