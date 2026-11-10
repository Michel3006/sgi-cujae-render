import { apiClient } from './api/client';
import type { ZenodoEntityType, ZenodoPublication, ZenodoPublishResponse } from '../types/zenodo';

export const zenodoService = {
  async listPublications(status?: 'published' | 'draft' | 'failed'): Promise<ZenodoPublication[]> {
    const params: Record<string, string> = {};
    if (status) {
      params.status = status;
    }
    const response = await apiClient.get<ZenodoPublication[]>('/zenodo/publications', { params });
    return response.data;
  },

  async getPublication(entityType: ZenodoEntityType, entityId: number): Promise<ZenodoPublication | null> {
    try {
      const response = await apiClient.get<ZenodoPublication>(
        `/zenodo/publications/${entityType}/${entityId}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async publish(
    entityType: ZenodoEntityType,
    entityId: number,
    file: File,
    publish = true,
  ): Promise<ZenodoPublishResponse> {
    const formData = new FormData();
    formData.append('entity_type', entityType);
    formData.append('entity_id', String(entityId));
    formData.append('publish', String(publish));
    formData.append('file', file);

    const response = await apiClient.post<ZenodoPublishResponse>('/zenodo/publish', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
