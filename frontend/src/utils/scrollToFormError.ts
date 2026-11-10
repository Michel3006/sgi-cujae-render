import type { RecordType } from '../types/record/types';

const TAB_DATOS_BASICOS = 'datos-basicos';
const TAB_AUTORES = 'autores';
const TAB_TUTORES = 'tutores';

/** Determina la pestaña donde está el campo con error. */
export const getTabIdForFieldError = (
  fieldKey: string,
  recordType: RecordType,
): string => {
  if (
    fieldKey === 'authors' ||
    fieldKey.startsWith('externalAuthorEmail_') ||
    fieldKey.startsWith('externalAuthorIdentity_')
  ) {
    return TAB_AUTORES;
  }
  if (fieldKey.startsWith('externalTutorEmail_')) {
    return TAB_TUTORES;
  }
  if (fieldKey === 'tutors' && recordType === 'tesis') {
    return TAB_TUTORES;
  }
  return TAB_DATOS_BASICOS;
};

/** Resuelve el id del elemento DOM al que hacer scroll/focus. */
export const getDomIdForFieldError = (fieldKey: string): string => {
  if (fieldKey === 'authors') return 'authors-section';
  if (fieldKey === 'tutors') return 'tutores-section';
  if (fieldKey.startsWith('externalAuthorEmail_')) return 'authorSearch';
  if (fieldKey.startsWith('externalTutorEmail_')) return 'tutorSearch';
  return fieldKey;
};

type ScrollToFormErrorOptions = {
  fieldKey: string;
  setActiveTab?: (tabId: string) => void;
  recordType?: RecordType;
};

/**
 * Cambia a la pestaña correcta (si aplica) y hace scroll hasta el primer campo con error.
 */
export const scrollToFormError = ({
  fieldKey,
  setActiveTab,
  recordType = 'articulo',
}: ScrollToFormErrorOptions): void => {
  const tabId = getTabIdForFieldError(fieldKey, recordType);
  setActiveTab?.(tabId);

  const domId = getDomIdForFieldError(fieldKey);

  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      const element =
        document.getElementById(domId) ??
        document.querySelector<HTMLElement>(`[data-field-key="${fieldKey}"]`);

      if (!element) {
        const formTop = document.getElementById('record-form-top');
        formTop?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const focusable =
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
          ? element
          : element.querySelector<HTMLElement>(
              'input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
            );

      focusable?.focus({ preventScroll: true });
    }, 80);
  });
};

/** Toma el mapa de errores y hace scroll al primero. */
export const scrollToFirstFormError = (
  errors: Record<string, string>,
  options: Omit<ScrollToFormErrorOptions, 'fieldKey'> = {},
): void => {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;
  scrollToFormError({ fieldKey: firstKey, ...options });
};
