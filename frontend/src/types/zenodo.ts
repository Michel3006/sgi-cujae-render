import type { RecordType } from './index';

export type ZenodoEntityType =
  | 'article'
  | 'book'
  | 'monograph'
  | 'norm'
  | 'patent'
  | 'software'
  | 'encounter'
  | 'prize'
  | 'thesis';

export type ZenodoPublicationStatus = 'draft' | 'published' | 'failed';

export interface ZenodoPublication {
  id_zenodo_publication: number;
  entity_type: ZenodoEntityType;
  entity_id: number;
  zenodo_deposition_id?: string | null;
  zenodo_record_id?: string | null;
  zenodo_conceptrecid?: string | null;
  doi?: string | null;
  zenodo_url?: string | null;
  status: ZenodoPublicationStatus;
  local_file_path?: string | null;
  original_filename?: string | null;
  error_message?: string | null;
  published_by?: number | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ZenodoPublishResponse {
  publication: ZenodoPublication;
  message: string;
}

export interface ZenodoPublishTarget {
  entityType: ZenodoEntityType;
  entityId: number;
  recordType: RecordType;
  title: string;
}
