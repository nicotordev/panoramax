/** Patterns common when ticketing HTML was flattened into `description`. */
export const DESCRIPTION_CRUFT_RE =
  /País seleccionado|Ticketplus\.com|add_shopping_cart|keyboard_arrow|COMPRAR\s+INFO\s+EVENTO|Iniciar sesión|Location\s+Countries|¿Necesitas más ayuda\?/i;

/** Regex-only check (e.g. parser snippets before storing as description). */
export function ticketingSnippetLooksPolluted(text: string): boolean {
  return DESCRIPTION_CRUFT_RE.test(text);
}

export function storedDescriptionLooksPolluted(
  description: string | null | undefined,
): boolean {
  const d = description?.trim();
  if (!d) {
    return false;
  }
  if (d.length > 600) {
    return true;
  }
  return ticketingSnippetLooksPolluted(d);
}
