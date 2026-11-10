/**
 * Salida en la consola del navegador para depuración.
 * No usa `window.print()` (eso abre el cuadro de impresión del documento).
 */
export const print = (...args: unknown[]): void => {
  console.log(...args)
}
