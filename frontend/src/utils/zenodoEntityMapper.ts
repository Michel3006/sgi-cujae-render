import type { RecordType } from '../types';
import type { ZenodoEntityType } from '../types/zenodo';
import type { ArticuloRegistro, Registro } from '../types/recordList/Registros';
import { normalizeDoiValue } from './doiUtils';

export const RECORD_TYPE_TO_ENTITY_TYPE: Record<RecordType, ZenodoEntityType> = {
  articulo: 'article',
  libro: 'book',
  monografia: 'monograph',
  norma: 'norm',
  patente: 'patent',
  software: 'software',
  evento: 'encounter',
  premio: 'prize',
  tesis: 'thesis',
};

export const ENTITY_TYPE_TO_RECORD_TYPE: Record<ZenodoEntityType, RecordType> = {
  article: 'articulo',
  book: 'libro',
  monograph: 'monografia',
  norm: 'norma',
  patent: 'patente',
  software: 'software',
  encounter: 'evento',
  prize: 'premio',
  thesis: 'tesis',
};

const ENTITY_ID_FIELDS: Record<RecordType, string> = {
  articulo: 'id_article',
  libro: 'id_book',
  monografia: 'id_monograph',
  norma: 'id_norm',
  patente: 'id_patent',
  software: 'id_software',
  evento: 'id_encounter',
  premio: 'id_prize',
  tesis: 'id_thesis',
};

export const mapRecordTypeToEntityType = (recordType: RecordType): ZenodoEntityType =>
  RECORD_TYPE_TO_ENTITY_TYPE[recordType];

export const extractEntityIdFromResponse = (
  recordType: RecordType,
  responseData: Record<string, unknown>,
): number => {
  const field = ENTITY_ID_FIELDS[recordType];
  const id = responseData[field];
  if (typeof id !== 'number') {
    throw new Error('No se pudo obtener el identificador del registro creado');
  }
  return id;
};

export const buildPublicationKey = (entityType: ZenodoEntityType, entityId: number): string =>
  `${entityType}:${entityId}`;

export const isRecordPublishedInZenodo = (
  recordType: RecordType,
  recordId: string,
  publishedKeys: Set<string>,
): boolean => {
  const entityType = mapRecordTypeToEntityType(recordType);
  const entityId = parseInt(recordId, 10);
  if (Number.isNaN(entityId)) return false;
  return publishedKeys.has(buildPublicationKey(entityType, entityId));
};

/** Solo los artículos tienen DOI; si ya lo tienen, se consideran publicados fuera de Zenodo. */
export const recordHasDoi = (
  recordType: RecordType,
  doi: string | null | undefined,
): boolean => recordType === 'articulo' && normalizeDoiValue(doi) !== null;

export const getRecordDoiFromRegistro = (record: Registro): string | null => {
  if ((record.tipo as RecordType) !== 'articulo') return null;
  return (record as ArticuloRegistro).doi;
};

export const canPublishRecordToZenodo = (
  recordType: RecordType,
  doi: string | null | undefined,
  isPublishedInZenodo: boolean,
): boolean => !isPublishedInZenodo && !recordHasDoi(recordType, doi);
