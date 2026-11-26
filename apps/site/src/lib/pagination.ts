/**
 * The page a `?page=` value asks for: a whole number from 1 up. Anything that is not one
 * (missing, text, zero, negative) is page 1.
 */
export function requestedPage(value: string | null): number {
  const page = Number(value ?? "1");
  return Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
}

/**
 * Whether a page exists. Check it before querying: the database rejects the offset of a
 * large enough page number, which fails the whole request. Page 1 always exists, so a
 * list with nothing in it still renders its empty state.
 */
export function pageExists(page: number, totalPages: number): boolean {
  return page <= Math.max(totalPages, 1);
}
