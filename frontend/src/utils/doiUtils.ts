/** Normaliza un DOI (quita prefijo doi.org si viene en la URL). */
export const normalizeDoiValue = (value: string | null | undefined): string | null => {
  if (!value?.trim()) return null;
  let doi = value.trim();
  doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  doi = doi.replace(/^doi:\s*/i, '');
  return doi || null;
};
