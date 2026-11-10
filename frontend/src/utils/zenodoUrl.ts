import type { ZenodoPublication } from '../types/zenodo';

const DEFAULT_WEB_HOST =
  (import.meta.env.VITE_ZENODO_WEB_HOST as string | undefined)?.trim() || 'zenodo.org';

const SANDBOX_WEB_HOST = 'sandbox.zenodo.org';

/** Detecta sandbox vs producción a partir de la URL guardada o variable de entorno. */
export const detectZenodoWebHost = (publication?: Partial<ZenodoPublication> | null): string => {
  const stored = publication?.zenodo_url?.toLowerCase() ?? '';
  if (stored.includes(SANDBOX_WEB_HOST)) {
    return SANDBOX_WEB_HOST;
  }
  if (DEFAULT_WEB_HOST.includes('sandbox')) {
    return SANDBOX_WEB_HOST;
  }
  return DEFAULT_WEB_HOST.includes('zenodo.org') ? DEFAULT_WEB_HOST : 'zenodo.org';
};

/**
 * URL para abrir el registro publicado en el navegador.
 *
 * Prioridad (alineada con la API de Zenodo):
 * 1. zenodo_url guardada (debe venir de record_url / doi_url del backend)
 * 2. DOI
 * 3. /records/{record_id} — solo el ID de registro publicado, nunca el id del depósito
 * 4. /records/{conceptrecid} — página del concepto (versiones)
 */
export const resolveZenodoViewUrl = (
  publication: Partial<ZenodoPublication> | null | undefined,
): string | null => {
  if (!publication) return null;

  const stored = publication.zenodo_url?.trim();
  if (stored) {
    if (stored.includes('/deposit/')) {
      // Enlace de borrador, no de registro publicado.
    } else {
      return stored;
    }
  }

  const doi = publication.doi?.trim();
  if (doi) {
    return doi.startsWith('http') ? doi : `https://doi.org/${doi}`;
  }

  const host = detectZenodoWebHost(publication);
  const recordId = publication.zenodo_record_id?.trim();
  if (recordId) {
    return `https://${host}/records/${recordId}`;
  }

  const conceptId = publication.zenodo_conceptrecid?.trim();
  if (conceptId) {
    return `https://${host}/records/${conceptId}`;
  }

  return null;
};

export const openZenodoViewUrl = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};
