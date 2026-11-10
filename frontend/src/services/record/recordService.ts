import { apiClient } from '../api/client';
import type {
  ArticlePayload,
  BookPayload,
  MonographPayload,
  NormPayload,
  PatentPayload,
  SoftwarePayload,
  EventPayload,
  PrizePayload,
  ThesisPayload,
} from '../../types/record/types';

// Utilidad para convertir "palabrasClave" a string o null
const parseKeywords = (keywords: string): string | null => 
  keywords.trim() ? keywords : null;

// Utilidad para generar only_date (YYYY-MM-DD)
const formatOnlyDate = (year: number, month: number): string => 
  `${year}-${String(month).padStart(2, '0')}-01`;

export const recordService = {
  // Artículo
  async createArticle(data: ArticlePayload) {
    return apiClient.post('/articles/', data);
  },

  // Libro / Monografía
  async createBook(data: BookPayload) {
    return apiClient.post('/books/', data);
  },

  async createMonograph(data: MonographPayload) {
    return apiClient.post('/monographs/', data);
  },

  // Norma
  async createNorm(data: NormPayload) {
    return apiClient.post('/norms/', data);
  },

  // Patente
  async createPatent(data: PatentPayload) {
    return apiClient.post('/patents/', data);
  },

  // Software
  async createSoftware(data: SoftwarePayload) {
    return apiClient.post('/softwares/', data);
  },

  // Evento
  async createEvent(data: EventPayload) {
    return apiClient.post('/encounters/', data);
  },

  // Premio
  async createPrize(data: PrizePayload) {
    return apiClient.post('/prizes/', data);
  },

  // Tesis
  async createThesis(data: ThesisPayload) {
    return apiClient.post('/theses/', data);
  },

  async updateArticle(articleId: number, data: Partial<ArticlePayload>) {
    return apiClient.put(`/articles/${articleId}`, data);
  },

  async updateBook(bookId: number, data: Partial<BookPayload>) {
    return apiClient.put(`/books/${bookId}`, data);
  },

  async updateMonograph(monographId: number, data: Partial<MonographPayload>) {
    return apiClient.put(`/monographs/${monographId}`, data);
  },

  async updateNorm(normId: number, data: Partial<NormPayload>) {
    return apiClient.put(`/norms/${normId}`, data);
  },

  async updatePatent(patentId: number, data: Partial<PatentPayload>) {
    return apiClient.put(`/patents/${patentId}`, data);
  },

  async updateSoftware(softwareId: number, data: Partial<SoftwarePayload>) {
    return apiClient.put(`/softwares/${softwareId}`, data);
  },

  async updateEvent(encounterId: number, data: Partial<EventPayload>) {
    return apiClient.put(`/encounters/${encounterId}`, data);
  },

  async updatePrize(prizeId: number, data: Partial<PrizePayload>) {
    return apiClient.put(`/prizes/${prizeId}`, data);
  },

  async updateThesis(thesisId: number, data: Partial<ThesisPayload>) {
    return apiClient.put(`/theses/${thesisId}`, data);
  },
};